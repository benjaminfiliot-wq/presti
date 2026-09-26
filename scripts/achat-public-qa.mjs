// scripts/achat-public-qa.mjs — juge de l'achat public sans compte (fiche 026-023, lot B ; critères AP de 026-025), écrit
// par Claude Code AVANT le code qu'il juge. L'exécutant qui le lance n'y touche jamais (CLAUDE.md:23).
//
//   node --import ./scripts/ts-loader.mjs scripts/achat-public-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
//
//   --racine=<d>  importe les modules et lit les sources sous <d> (défaut : le dépôt) ; HEAD est celui du dépôt git.
//   --temoin      seulement AP-10 (NR) et la règle commune des preuves vides (AP-PV).
//   --reel        Claude Code seulement, après déploiement : AP-12 contre PRESTI_BASE_URL (défaut https://prestiapp.fr),
//                 .env.local chargé par le juge (rien n'est affiché) ; refusé (code 2) tant que 026-025 n'est pas PASS.
//
// Les modules sont importés dans un PROCESSUS ENFANT (ce même script, --enfant=complet), horloge figée au
// 2026-09-26T10:00:00Z, avec les doublures de scripts/fixtures/026-livraison-tresor/b/doublures.mjs : base en mémoire,
// auth.admin consigné (createUser, generateLink ; « adresse déjà inscrite » sur demande), e-mails consignés, Checkout
// consigné (une session cs_sim_… rendue), signature des webhooks par le vrai module stripe.webhooks (HMAC pur, secret
// assemblé à l'exécution), lib/siteLivraison doublé (envoyerCourrielsDus qui lève sur demande). Aucun réseau (fetch piégé).
//
// Critères (cahier du juge de 026-025) :
//   AP-1  lib/siteAchatPublic.ts exporte ouvrirCompteAcheteur et purgerBrouillonsPublics ; lib/siteCommandeServeur.ts exporte
//         parametresCheckoutSite et poserSessionStripePublique. Un fichier absent : les critères suivants sont « non jugés ».
//   AP-2  un seul constructeur : les deux routes appellent parametresCheckoutSite( et ne contiennent ni invoice_creation, ni
//         line_items, ni unit_amount ; pour les mêmes entrées, les variantes avec compte et publique ne diffèrent que par
//         customer, customer_email, client_reference_id, metadata.uid, metadata.achat, payment_intent_data.metadata (mêmes
//         clés que metadata), success_url et cancel_url ; la publique n'a ni uid ni client_reference_id, porte achat: 'public',
//         customer_email, et ses adresses de retour (/site/commander/merci?commande=<id>, /site/acheter?annule=1).
//   AP-3  sans STRIPE_PRIX_SITE ni STRIPE_TAXE_AUTO : mode 'payment', unit_amount = PRIX_SITE_CENTS, invoice_creation.enabled
//         avec le pied mentionFranchise('auto'), metadata.type = 'commande_site' et metadata.commande_id ; avec
//         STRIPE_TAXE_AUTO=1 : pas de pied, automatic_tax activé.
//   AP-4  la route publique : ordre lu dans le source (actif(, isBanned(, website, consommerLimite(, cgu, insert() ; aucun
//         authArtisan ; exécutée : drapeau baissé → 404 sans lecture ; adresse bannie → 403 ; piège → 200 sans écriture ni
//         plafond consommé ; corps valide → 200 { url }, une ligne artisan_id null, achat_public true, brouillon, adresse en
//         minuscules, cgu_acceptees_le posé, prix_cents = PRIX_SITE_CENTS, stripe_session_id = la session du Checkout ; les
//         corps invalides → 400 sans écriture ; 6e envoi d'une même adresse dans l'heure → 429.
//   AP-5  le webhook, événement signé du jeu d'essai : 1er passage → 200, encaissée, un createUser sans password et un
//         generateLink magiclink, un e-mail, lien_envoye_le posé ; 2e passage → 200 sans nouvel appel ; envoi refusé → 500,
//         lien_envoye_le vide, puis le passage suivant envoie ; envoyerCourrielsDus qui lève → 200 quand même ; commande
//         introuvable → 500 ; commande avec compte → aucun appel à auth.admin.
//   AP-6  ouvrirCompteAcheteur : un seul destinataire, commande.email, critique: true, un seul lien, hôte prestiapp.fr,
//         chemin /connexion/lien, th = hashed_token et commande = id ; ni mot de passe, ni SIREN, ni adresse postale, ni
//         action_link ; adresse déjà inscrite → un seul createUser, le lien part ; brouillon ou commande avec compte → rien.
//   AP-7  renvoyer : même statut et même corps (200 { ok: true }) pour une commande payée, inconnue ou en brouillon ; un
//         champ email dans le corps est ignoré ; 4e appel dans l'heure → rien de renvoyé ; drapeau baissé → 404.
//   AP-8  purgerBrouillonsPublics, 6 lignes : seule brouillon + achat_public + sans compte + plus de 7 jours est effacée ;
//         lib/siteLivraison.ts appelle purgerBrouillonsPublics( dans un try de tourLivraison.
//   AP-9  lib/flags.ts porte siteAchatPublic: false ; la carte de scripts/fermeture-e2e.mjs porte la ligne de l'étape 6, son
//         diff (depuis la dernière version sans siteAchatPublic) se limite à cette ligne ; chaque drapeau de FLAGS est dans
//         la carte.
//   AP-10 (NR) lib/stripe.ts, lib/abonnementSync.ts, lib/stripeAiguillage.ts et lib/siteCommande.ts n'ont pas changé depuis
//         HEAD ; scripts/webhook-muet-qa.mjs reste vert (relancé seulement quand la racine est le dépôt : il ne juge que lui).
//   AP-11 npm run typecheck (tsc --noEmit) vert sur la racine.
//   AP-12 (--reel) drapeau baissé : les deux routes publiques rendent 404 ; drapeau levé : POST public d'une adresse
//         @presti-test.invalid → une session cs_…, expirée ensuite ; webhook simulé signé → commande payee, utilisateur
//         créé, lien_envoye_le posé ; rejeu → rien de neuf ; ménage (utilisateur, commande) dans un finally.
//   AP-PV un fichier de 0 octet dans .orchestre/preuves/026-025/ est un échec (règle commune, tous les modes).
//
// Sortie : une ligne par critère, puis « achat-public-qa : PASS|FAIL ». Code 0 seulement si tout est vert ; 1 sinon ; 2 si
// l'appel est invalide ou un préalable absent. Écriture seulement sous .orchestre/travail/achat-public-qa/.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import {
  R, lireOptions, refuserAppel, creerSortie, court, premiereLigne, lireRacine, sansCommentaires, importsDe, exportsNommes,
  corpsDeFonction, differentsDeHead, jugerPreuvesVides, lancerEnfant, resultatEnfant, importer, figerHorloge, jugerDans,
  typecheck, chargerEnvLocal, fichePass, baseAvant, diffLignes, lancer, egalProfond, marqueEssai,
} from './fixtures/026-livraison-tresor/commun.mjs'
import { preparerEnfantB, jeuB, DOUBLES_B, requeteJson, corpsJson } from './fixtures/026-livraison-tresor/b/enfant.mjs'

const JUGE = 'achat-public-qa'
const FICHE = '026-025'
const CE_SCRIPT = fileURLToPath(import.meta.url)
const o = lireOptions(process.argv.slice(2))
const RAC = o.racine

const ROUTE_PUB = 'app/api/site/commander/public/route.ts'
const ROUTE_RENVOYER = 'app/api/site/commander/public/renvoyer/route.ts'
const ROUTE_AVEC_COMPTE = 'app/api/site/commander/route.ts'
const WEBHOOK = 'app/api/stripe/webhook/route.ts'
const LIB_ACHAT = 'lib/siteAchatPublic.ts'
const LIB_SRV = 'lib/siteCommandeServeur.ts'
const LIB_SITE = 'lib/siteCommande.ts'
const LIB_FACT = 'lib/facturation.ts'
const LIB_FLAGS = 'lib/flags.ts'
const LIB_LIVRAISON = 'lib/siteLivraison.ts'
const FERMETURE = 'scripts/fermeture-e2e.mjs'
const INCHANGES = ['lib/stripe.ts', 'lib/abonnementSync.ts', 'lib/stripeAiguillage.ts', 'lib/siteCommande.ts']
const DOUBLES = { ...DOUBLES_B, 'lib/siteLivraison': 'siteLivraison' }
// Le secret de webhook du juge, assemblé à l'exécution (jamais écrit en clair) : la doublure signe et la route vérifie.
const SECRET_WEBHOOK = ['whsec', 'juge026b' + 'a'.repeat(24)].join('_')
const URL_PUB = 'https://prestiapp.fr/api/site/commander/public'
const URL_RENVOYER = 'https://prestiapp.fr/api/site/commander/public/renvoyer'
const URL_WEBHOOK = 'https://prestiapp.fr/api/stripe/webhook'
const ORIGINE = 'https://prestiapp.fr'

// ═══ Le processus enfant ════════════════════════════════════════════════════════════════════════════════════════════════
if (o.enfant === 'complet') {
  figerHorloge('2026-09-26T10:00:00Z')
  const { D, reseau } = await preparerEnfantB({ racines: [RAC], doubles: DOUBLES })
  const E = D.etat
  const suivi = { reseau, inconnues: E.inconnues }
  const res = { criteres: {} }
  const C = jeuB('commandes.json'), V = jeuB('formulaire-valide.json'), I = jeuB('formulaires-invalides.json'), EV = jeuB('evenement-achat-public.json'), AA = jeuB('auth-admin.json')
  const { default: Stripe } = await import('stripe')
  const signer = (payload) => new Stripe(['sk', 'test', 'juge026b' + '0'.repeat(20)].join('_')).webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET })
  const site = await importer(RAC, LIB_SITE), fact = await importer(RAC, LIB_FACT), srv = await importer(RAC, LIB_SRV), achat = await importer(RAC, LIB_ACHAT)
  const routePub = await importer(RAC, ROUTE_PUB), routeRenv = await importer(RAC, ROUTE_RENVOYER), webhook = await importer(RAC, WEBHOOK)
  const drapeaux = { siteAchatPublic: true, siteCommande: true }
  const reinit = (conf = {}) => D.reinitialiser({ drapeaux, ...conf })
  const lignes = (t = 'sites_commandes') => E.tables[t] ?? []
  const ligne = (id) => lignes().find((l) => l.id === id)
  const brouillonPublic = () => ({ ...C.commande_publique_payee, etat: 'brouillon', paye_le: null })
  const appelsAdmin = () => E.b.authAdmin.appels.map((a) => a.methode)
  const courriels = () => E.emails.filter((m) => m.genre === 'sendEmail')
  const PRIX = site.m?.PRIX_SITE_CENTS
  const VALIDE = Object.fromEntries(Object.entries(V).filter(([k]) => !k.startsWith('_') && k !== 'attendu'))
  const entree ={ commandeId: C.commande_publique_payee.id, email: C.commande_publique_payee.email, clientStripe: 'cus_sim_026b', uid: AA.artisan.uid, origin: ORIGINE }
  const poster = (url, corps, ip = '1.2.3.4') => requeteJson(url, { corps, ip })
  const livrer = async (evenement) => {
    const payload = JSON.stringify(evenement)
    const r = await webhook.m.POST(new Request(URL_WEBHOOK, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signer(payload) }, body: payload }))
    return { status: r.status, corps: await corpsJson(r) }
  }
  const evenementPour = (commandeId, extra = {}) => { const ev = structuredClone(EV); ev.data.object.metadata = { ...ev.data.object.metadata, commande_id: commandeId, ...extra }; return ev }

  await jugerDans(res, 'AP-2', async () => {
    const e = []
    if (typeof srv.m?.parametresCheckoutSite !== 'function') return { echecs: [`${LIB_SRV} : parametresCheckoutSite absente (${srv.erreur ?? 'export absent'})`] }
    delete process.env.STRIPE_PRIX_SITE; delete process.env.STRIPE_TAXE_AUTO
    const avec = await srv.m.parametresCheckoutSite({ ...entree, public: false }), sans = await srv.m.parametresCheckoutSite({ ...entree, public: true })
    // customer_update n'a de sens qu'avec customer (Stripe le refuse sans client) : il suit customer, donc la liste du cahier.
    const PERMIS = ['customer', 'customer_update', 'customer_email', 'client_reference_id', 'metadata.uid', 'metadata.achat', 'payment_intent_data.metadata', 'success_url', 'cancel_url']
    const retirer = (p) => { const x = structuredClone(p ?? {}); for (const c of PERMIS) { const parts = c.split('.'); let cible = x; for (const k of parts.slice(0, -1)) cible = cible?.[k]; if (cible && typeof cible === 'object') delete cible[parts.at(-1)] } return x }
    e.push(...egalProfond(retirer(avec), retirer(sans)).slice(0, 6).map((x) => `hors des champs permis, avec compte ≠ public : ${x}`))
    for (const [nom, p] of [['avec compte', avec], ['public', sans]]) {
      const a = Object.keys(p?.metadata ?? {}).sort().join(','), b = Object.keys(p?.payment_intent_data?.metadata ?? {}).sort().join(',')
      if (a !== b) e.push(`${nom} : les clés de payment_intent_data.metadata (${b || 'aucune'}) ne sont pas celles de metadata (${a || 'aucune'})`)
    }
    if (sans?.metadata?.achat !== 'public') e.push(`public : metadata.achat = ${JSON.stringify(sans?.metadata?.achat)}, 'public' attendu`)
    if (sans?.metadata && 'uid' in sans.metadata) e.push('public : metadata.uid présent')
    if (sans?.client_reference_id !== undefined) e.push(`public : client_reference_id = ${JSON.stringify(sans.client_reference_id)}, absent attendu`)
    if (sans?.customer_email !== entree.email) e.push(`public : customer_email = ${JSON.stringify(sans?.customer_email)}, ${entree.email} attendu`)
    if (sans?.customer !== undefined) e.push('public : customer présent (aucun client Stripe sans compte)')
    if (sans?.success_url !== `${ORIGINE}/site/commander/merci?commande=${entree.commandeId}`) e.push(`public : success_url = ${JSON.stringify(sans?.success_url)}, ${ORIGINE}/site/commander/merci?commande=${entree.commandeId} attendu`)
    if (sans?.cancel_url !== `${ORIGINE}/site/acheter?annule=1`) e.push(`public : cancel_url = ${JSON.stringify(sans?.cancel_url)}, ${ORIGINE}/site/acheter?annule=1 attendu`)
    if (avec?.metadata?.uid !== entree.uid || avec?.client_reference_id !== entree.uid) e.push('avec compte : metadata.uid et client_reference_id doivent porter uid')
    if (avec?.metadata && 'achat' in avec.metadata) e.push('avec compte : metadata.achat présent')
    if (avec?.customer !== entree.clientStripe) e.push(`avec compte : customer = ${JSON.stringify(avec?.customer)}, ${entree.clientStripe} attendu`)
    return { echecs: e, detail: `parametresCheckoutSite : mêmes entrées, les variantes avec compte et publique ne diffèrent que par ${PERMIS.join(', ')} ; publique sans uid ni client_reference_id, achat: 'public', customer_email, retours /site/commander/merci?commande=<id> et /site/acheter?annule=1` }
  }, suivi)

  await jugerDans(res, 'AP-3', async () => {
    const e = []
    if (typeof srv.m?.parametresCheckoutSite !== 'function') return { echecs: ['parametresCheckoutSite absente (AP-1)'] }
    if (typeof fact.m?.mentionFranchise !== 'function' || typeof PRIX !== 'number') return { echecs: [`${LIB_FACT} ou ${LIB_SITE} inimportable (${fact.erreur ?? site.erreur ?? 'export absent'})`] }
    delete process.env.STRIPE_PRIX_SITE; delete process.env.STRIPE_TAXE_AUTO
    const p = await srv.m.parametresCheckoutSite({ ...entree, public: false })
    if (p?.mode !== 'payment') e.push(`mode = ${JSON.stringify(p?.mode)}, 'payment' attendu`)
    const li = p?.line_items?.[0]
    if (li?.price_data?.unit_amount !== PRIX) e.push(`line_items[0].price_data.unit_amount = ${JSON.stringify(li?.price_data?.unit_amount)}, PRIX_SITE_CENTS (${PRIX}) attendu`)
    if (li?.quantity !== 1) e.push(`line_items[0].quantity = ${JSON.stringify(li?.quantity)}, 1 attendu`)
    if (p?.invoice_creation?.enabled !== true) e.push('invoice_creation.enabled ≠ true')
    const pied = fact.m.mentionFranchise('auto')
    if (p?.invoice_creation?.invoice_data?.footer !== pied) e.push(`invoice_creation.invoice_data.footer = ${court(JSON.stringify(p?.invoice_creation?.invoice_data?.footer), 60)}, mentionFranchise('auto') attendu`)
    if (p?.metadata?.type !== 'commande_site') e.push(`metadata.type = ${JSON.stringify(p?.metadata?.type)}, 'commande_site' attendu`)
    if (p?.metadata?.commande_id !== entree.commandeId) e.push(`metadata.commande_id = ${JSON.stringify(p?.metadata?.commande_id)}, ${entree.commandeId} attendu`)
    process.env.STRIPE_TAXE_AUTO = '1'
    const t = await srv.m.parametresCheckoutSite({ ...entree, public: false })
    delete process.env.STRIPE_TAXE_AUTO
    if (t?.invoice_creation?.invoice_data?.footer !== undefined) e.push('STRIPE_TAXE_AUTO=1 : le pied de franchise est encore posé')
    if (t?.automatic_tax?.enabled !== true) e.push('STRIPE_TAXE_AUTO=1 : automatic_tax.enabled ≠ true')
    return { echecs: e, detail: `sans STRIPE_PRIX_SITE ni STRIPE_TAXE_AUTO : mode payment, unit_amount ${PRIX}, invoice_creation.enabled avec le pied mentionFranchise('auto'), metadata.type commande_site et commande_id ; STRIPE_TAXE_AUTO=1 : sans pied, automatic_tax activé` }
  }, suivi)

  await jugerDans(res, 'AP-4', async () => {
    const e = []
    if (typeof routePub.m?.POST !== 'function') return { echecs: [`${ROUTE_PUB} n'exporte pas POST (${routePub.erreur ?? 'export absent'})`] }
    // Drapeaux baissés : 404 avant toute lecture.
    for (const d of ['siteAchatPublic', 'siteCommande']) {
      reinit({ drapeaux: { ...drapeaux, [d]: false } })
      const r = await routePub.m.POST(poster(URL_PUB, VALIDE))
      if (r.status !== 404) e.push(`${d} baissé → ${r.status}, 404 attendu`)
      if (E.b.journal.some((j) => j.startsWith('from:'))) e.push(`${d} baissé : la base est lue (${E.b.journal.filter((j) => j.startsWith('from:')).join(', ')})`)
    }
    // Adresse bannie : 403, rien d'écrit.
    reinit({ tables: { ip_bans: [{ ip: '9.9.9.9', expires_le: null }] } })
    { const r = await routePub.m.POST(poster(URL_PUB, VALIDE, '9.9.9.9')); if (r.status !== 403) e.push(`adresse bannie → ${r.status}, 403 attendu`); if (E.ecritures.length) e.push('adresse bannie : une écriture') }
    // Corps valide.
    reinit()
    {
      const r = await routePub.m.POST(poster(URL_PUB, VALIDE))
      const corps = await corpsJson(r)
      if (r.status !== 200) e.push(`corps valide → ${r.status} (${court(JSON.stringify(corps), 80)}), 200 attendu`)
      if (typeof corps?.url !== 'string' || !corps.url.startsWith('https://checkout.stripe.com/')) e.push(`corps valide : url = ${court(JSON.stringify(corps?.url), 60)}, l'adresse du Checkout attendue`)
      const l = lignes()
      if (l.length !== 1) e.push(`corps valide : ${l.length} ligne(s) dans sites_commandes, 1 attendue`)
      else {
        for (const [k, v] of Object.entries(V.attendu)) if (l[0][k] !== v) e.push(`corps valide : ${k} = ${JSON.stringify(l[0][k])}, ${JSON.stringify(v)} attendu`)
        if (!l[0].cgu_acceptees_le) e.push('corps valide : cgu_acceptees_le vide')
        if (l[0].prix_cents !== PRIX) e.push(`corps valide : prix_cents = ${l[0].prix_cents}, ${PRIX} attendu`)
        if (E.b.checkouts.length !== 1) e.push(`corps valide : ${E.b.checkouts.length} Checkout créé(s), 1 attendu`)
        else if (l[0].stripe_session_id !== E.b.checkouts[0].id) e.push(`corps valide : stripe_session_id = ${JSON.stringify(l[0].stripe_session_id)}, la session ${E.b.checkouts[0].id} attendue (poserSessionStripePublique)`)
        if (E.b.checkouts[0]?.params?.metadata?.achat !== 'public') e.push('corps valide : le Checkout ne porte pas metadata.achat = public')
      }
    }
    // Les six corps invalides : 400 (ou 200 neutre pour le piège), sans écriture.
    for (const c of I.cas) {
      reinit()
      const r = await routePub.m.POST(poster(URL_PUB, c.corps, '2.3.4.5'))
      if (r.status !== c.statut) e.push(`« ${c.nom} » → ${r.status}, ${c.statut} attendu`)
      if (E.ecritures.length) e.push(`« ${c.nom} » : ${E.ecritures.length} écriture(s), 0 attendue`)
      if (E.b.checkouts.length) e.push(`« ${c.nom} » : un Checkout créé`)
      if (c.statut === 200 && E.limites.size) e.push(`« ${c.nom} » : un plafond consommé (le piège se juge avant les plafonds)`)
    }
    // Le plafond par adresse : 5 dans l'heure, le 6e → 429.
    reinit()
    {
      const statuts = []
      for (let i = 0; i < 6; i++) statuts.push((await routePub.m.POST(poster(URL_PUB, { ...VALIDE, email: `plafond-${i}@presti-test.invalid` }, '5.5.5.5'))).status)
      if (statuts.slice(0, 5).some((s) => s !== 200) || statuts[5] !== 429) e.push(`6 envois d'une même adresse dans l'heure → ${statuts.join(', ')} ; 200 × 5 puis 429 attendus`)
    }
    return { echecs: e, detail: `route publique exécutée : drapeaux baissés → 404 sans lecture ; adresse bannie → 403 ; piège → 200 sans écriture ni plafond ; corps valide → 200 { url }, une ligne artisan_id null, achat_public true, brouillon, adresse en minuscules, cgu_acceptees_le et prix_cents posés, stripe_session_id = la session du Checkout ; ${I.cas.filter((c) => c.statut === 400).length} corps invalides → 400 sans écriture ; 6e envoi d'une adresse dans l'heure → 429` }
  }, suivi)

  await jugerDans(res, 'AP-5', async () => {
    const e = []
    if (typeof webhook.m?.POST !== 'function') return { echecs: [`${WEBHOOK} n'exporte pas POST (${webhook.erreur ?? 'export absent'})`] }
    const ev = evenementPour(C.commande_publique_payee.id)
    // 1er passage.
    reinit({ tables: { sites_commandes: [brouillonPublic()], artisans: [] } })
    let r = await livrer(ev)
    if (r.status !== 200) e.push(`1er passage → ${r.status} (${court(JSON.stringify(r.corps), 80)}), 200 attendu`)
    let l = ligne(C.commande_publique_payee.id)
    if (l?.etat !== 'payee') e.push(`1er passage : etat = ${JSON.stringify(l?.etat)}, payee attendu`)
    const a1 = E.b.authAdmin.appels
    if (appelsAdmin().join(',') !== 'createUser,generateLink') e.push(`1er passage : appels auth.admin ${JSON.stringify(appelsAdmin())}, createUser puis generateLink attendus`)
    if (a1[0]?.methode === 'createUser' && ('password' in (a1[0].params ?? {}))) e.push('1er passage : createUser porte un password')
    if (a1[0]?.methode === 'createUser' && a1[0].params?.email_confirm !== true) e.push('1er passage : createUser sans email_confirm: true')
    if (a1[1]?.methode === 'generateLink' && a1[1].params?.type !== 'magiclink') e.push(`1er passage : generateLink de type ${JSON.stringify(a1[1]?.params?.type)}, magiclink attendu`)
    if (courriels().length !== 1) e.push(`1er passage : ${courriels().length} e-mail(s) à l'acheteur, 1 attendu`)
    if (!l?.lien_envoye_le) e.push('1er passage : lien_envoye_le vide')
    if (l?.lien_envois !== 1) e.push(`1er passage : lien_envois = ${JSON.stringify(l?.lien_envois)}, 1 attendu`)
    // 2e passage : rien de neuf.
    r = await livrer(ev)
    if (r.status !== 200) e.push(`2e passage → ${r.status}, 200 attendu`)
    if (E.b.authAdmin.appels.length !== 2) e.push(`2e passage : ${E.b.authAdmin.appels.length - 2} nouvel(s) appel(s) à auth.admin, 0 attendu`)
    if (courriels().length !== 1) e.push(`2e passage : ${courriels().length - 1} nouvel e-mail, 0 attendu`)
    if (ligne(C.commande_publique_payee.id)?.lien_envois !== 1) e.push('2e passage : lien_envois a bougé')
    // L'envoi du lien échoue : 500, rien de marqué ; puis le passage suivant envoie.
    reinit({ tables: { sites_commandes: [brouillonPublic()], artisans: [] }, modeEmail: 'refuse' })
    r = await livrer(ev)
    if (r.status !== 500) e.push(`envoi refusé → ${r.status}, 500 attendu (Stripe doit rejouer)`)
    l = ligne(C.commande_publique_payee.id)
    if (l?.etat !== 'payee') e.push(`envoi refusé : etat = ${JSON.stringify(l?.etat)}, payee attendu (l'encaissement reste acquis)`)
    if (l?.lien_envoye_le) e.push('envoi refusé : lien_envoye_le posé quand même')
    E.modeEmail = 'ok'
    r = await livrer(ev)
    if (r.status !== 200) e.push(`3e passage après l'échec → ${r.status}, 200 attendu`)
    l = ligne(C.commande_publique_payee.id)
    if (!l?.lien_envoye_le) e.push('3e passage : lien_envoye_le toujours vide')
    if (!courriels().at(-1) || courriels().at(-1).to !== C.commande_publique_payee.email) e.push('3e passage : aucun e-mail à l\'acheteur')
    // envoyerCourrielsDus en échec ne change pas la réponse.
    reinit({ tables: { sites_commandes: [brouillonPublic()], artisans: [] }, b: { courriels: 'leve' } })
    r = await livrer(ev)
    if (r.status !== 200) e.push(`envoyerCourrielsDus qui lève → ${r.status}, 200 attendu`)
    if (!E.b.courriels.appels.includes(C.commande_publique_payee.id)) e.push('envoyerCourrielsDus n\'est pas appelée avec l\'identifiant de la commande')
    // Commande introuvable : 500, toujours.
    reinit({ tables: { sites_commandes: [], artisans: [] } })
    const inconnue = evenementPour('cmd-inconnue-026b')
    for (const n of [1, 2]) { r = await livrer(inconnue); if (r.status !== 500) e.push(`commande introuvable, passage ${n} → ${r.status}, 500 attendu`) }
    if (E.b.authAdmin.appels.length) e.push('commande introuvable : auth.admin appelé')
    // Une commande avec compte : rien du côté des comptes.
    reinit({ tables: { sites_commandes: [{ ...C.commande_autre_compte, etat: 'brouillon', paye_le: null }], artisans: [{ id: C.commande_autre_compte.artisan_id, email: C.commande_autre_compte.email, nom: 'Autre', metier: 'Électricien' }] } })
    const avecCompte = evenementPour(C.commande_autre_compte.id, { uid: C.commande_autre_compte.artisan_id }); delete avecCompte.data.object.metadata.achat; avecCompte.data.object.id = C.commande_autre_compte.stripe_session_id; avecCompte.data.object.customer_details = { email: C.commande_autre_compte.email }
    r = await livrer(avecCompte)
    if (r.status !== 200) e.push(`commande avec compte → ${r.status}, 200 attendu`)
    if (ligne(C.commande_autre_compte.id)?.etat !== 'payee') e.push('commande avec compte : pas encaissée')
    if (E.b.authAdmin.appels.length) e.push(`commande avec compte : ${E.b.authAdmin.appels.length} appel(s) à auth.admin, 0 attendu`)
    return { echecs: e, detail: `webhook rejoué avec l'événement signé (STRIPE_WEBHOOK_SECRET du juge) : 1er passage → 200, encaissée, createUser sans password + generateLink magiclink, 1 e-mail, lien_envoye_le posé ; 2e → 200 sans nouvel appel ; envoi refusé → 500 et rien de marqué, puis 200 et le lien part ; envoyerCourrielsDus qui lève → 200 ; introuvable → 500 × 2 ; commande avec compte → encaissée sans auth.admin` }
  }, suivi)

  await jugerDans(res, 'AP-6', async () => {
    const e = []
    if (typeof achat.m?.ouvrirCompteAcheteur !== 'function') return { echecs: [`${LIB_ACHAT} : ouvrirCompteAcheteur absente (${achat.erreur ?? 'export absent'})`] }
    const cmd = C.commande_publique_payee
    reinit({ tables: { sites_commandes: [structuredClone(cmd)], artisans: [] } })
    try { await achat.m.ouvrirCompteAcheteur(cmd.id) } catch (err) { e.push(`ouvrirCompteAcheteur lève : ${premiereLigne(err)}`) }
    const m = courriels()
    if (m.length !== 1) e.push(`${m.length} e-mail(s), 1 attendu`)
    else {
      if (m[0].to !== cmd.email) e.push(`destinataire ${JSON.stringify(m[0].to)}, ${cmd.email} attendu`)
      if (m[0].critique !== true) e.push(`critique = ${JSON.stringify(m[0].critique)}, true attendu`)
      const texte = `${m[0].subject ?? ''}\n${m[0].text ?? ''}`
      const liens = texte.match(/https?:\/\/[^\s"'<>)]+/g) ?? []
      if (liens.length !== 1) e.push(`${liens.length} lien(s) dans l'e-mail, 1 attendu`)
      else {
        let u = null
        try { u = new URL(liens[0]) } catch { e.push(`lien illisible : ${court(liens[0], 80)}`) }
        if (u) {
          if (u.hostname !== 'prestiapp.fr') e.push(`hôte du lien ${u.hostname}, prestiapp.fr attendu`)
          if (u.pathname !== '/connexion/lien') e.push(`chemin du lien ${u.pathname}, /connexion/lien attendu`)
          if (u.searchParams.get('th') !== AA.generateLink.hashed_token) e.push('le lien ne porte pas th = hashed_token')
          if (u.searchParams.get('commande') !== cmd.id) e.push('le lien ne porte pas commande = <id>')
        }
      }
      if (/mot de passe/i.test(texte)) e.push('le texte parle d\'un mot de passe')
      if (/\b\d{9}\b/.test(texte)) e.push('le texte contient une suite de 9 chiffres (SIREN ?)')
      if (/\b\d{5}\b/.test(texte) || /\b(rue|avenue|boulevard|chemin|impasse)\b/i.test(texte)) e.push('le texte contient une adresse postale')
      if (texte.includes(AA.generateLink.action_link) || /supabase/i.test(texte)) e.push('le texte contient action_link ou Supabase')
    }
    const l = ligne(cmd.id)
    if (!l?.lien_envoye_le || l?.lien_envois !== 1) e.push(`après l'envoi : lien_envoye_le = ${JSON.stringify(l?.lien_envoye_le)}, lien_envois = ${JSON.stringify(l?.lien_envois)}`)
    // Adresse déjà inscrite : pas de second createUser, et le lien part.
    reinit({ tables: { sites_commandes: [structuredClone(cmd)], artisans: [] }, b: { dejaInscrit: true } })
    try { await achat.m.ouvrirCompteAcheteur(cmd.id) } catch (err) { e.push(`adresse déjà inscrite : ouvrirCompteAcheteur lève (${premiereLigne(err)})`) }
    if (appelsAdmin().filter((x) => x === 'createUser').length !== 1) e.push(`adresse déjà inscrite : ${appelsAdmin().filter((x) => x === 'createUser').length} createUser, 1 attendu`)
    if (!appelsAdmin().includes('generateLink')) e.push('adresse déjà inscrite : pas de generateLink')
    if (courriels().length !== 1) e.push(`adresse déjà inscrite : ${courriels().length} e-mail(s), 1 attendu`)
    // Brouillon, ou commande avec compte : rien.
    for (const [nom, c] of [['brouillon', brouillonPublic()], ['commande avec compte', structuredClone(C.payee_non_publique)]]) {
      reinit({ tables: { sites_commandes: [c], artisans: [] } })
      try { await achat.m.ouvrirCompteAcheteur(c.id) } catch { /* un refus qui lève est acceptable */ }
      if (E.b.authAdmin.appels.length || courriels().length) e.push(`${nom} : ${E.b.authAdmin.appels.length} appel(s) à auth.admin et ${courriels().length} e-mail(s), 0 attendu`)
      if (ligne(c.id)?.lien_envoye_le) e.push(`${nom} : lien_envoye_le posé`)
    }
    return { echecs: e, detail: `ouvrirCompteAcheteur : un seul e-mail, à commande.email, critique: true, un seul lien https://prestiapp.fr/connexion/lien?th=<hashed_token>&commande=<id> ; ni mot de passe, ni SIREN, ni adresse, ni action_link ; adresse déjà inscrite → un seul createUser et le lien part ; brouillon ou commande avec compte → rien` }
  }, suivi)

  await jugerDans(res, 'AP-7', async () => {
    const e = []
    if (typeof routeRenv.m?.POST !== 'function') return { echecs: [`${ROUTE_RENVOYER} n'exporte pas POST (${routeRenv.erreur ?? 'export absent'})`] }
    const cmd = C.commande_publique_payee
    const reponses = []
    for (const [nom, id, tables] of [['payée', cmd.id, [structuredClone(cmd)]], ['inconnue', 'cmd-inconnue-026b', [structuredClone(cmd)]], ['brouillon', cmd.id, [brouillonPublic()]]]) {
      reinit({ tables: { sites_commandes: tables, artisans: [] } })
      const r = await routeRenv.m.POST(poster(URL_RENVOYER, { commande: id }))
      const corps = await corpsJson(r)
      reponses.push({ nom, status: r.status, corps: JSON.stringify(corps), emails: courriels().length })
    }
    if (reponses[0].status !== 200 || reponses[0].corps !== JSON.stringify({ ok: true })) e.push(`commande payée → ${reponses[0].status} ${reponses[0].corps}, 200 {"ok":true} attendu`)
    for (const x of reponses.slice(1)) if (x.status !== reponses[0].status || x.corps !== reponses[0].corps) e.push(`commande ${x.nom} → ${x.status} ${x.corps}, la même réponse que pour une commande payée attendue`)
    if (reponses[0].emails !== 1) e.push(`commande payée : ${reponses[0].emails} e-mail(s), 1 attendu`)
    for (const x of reponses.slice(1)) if (x.emails !== 0) e.push(`commande ${x.nom} : ${x.emails} e-mail(s), 0 attendu`)
    // Un champ email dans le corps est ignoré.
    reinit({ tables: { sites_commandes: [structuredClone(cmd)], artisans: [] } })
    { const r = await routeRenv.m.POST(poster(URL_RENVOYER, { commande: cmd.id, email: 'pirate@presti-test.invalid' })); if (r.status !== 200) e.push(`corps avec email → ${r.status}`); const m = courriels(); if (m.length !== 1 || m[0].to !== cmd.email) e.push(`corps avec email : ${m.length} e-mail(s) vers ${JSON.stringify(m.map((x) => x.to))}, 1 vers ${cmd.email} attendu`) }
    // Au 4e appel dans l'heure, rien n'est renvoyé.
    reinit({ tables: { sites_commandes: [structuredClone(cmd)], artisans: [] } })
    { const statuts = []; for (let i = 0; i < 4; i++) statuts.push((await routeRenv.m.POST(poster(URL_RENVOYER, { commande: cmd.id }, `7.7.7.${i}`))).status); if (statuts.some((s) => s !== 200)) e.push(`4 appels → ${statuts.join(', ')}, 200 × 4 attendus`); if (courriels().length !== 3) e.push(`4 appels dans l'heure : ${courriels().length} e-mail(s), 3 attendus`) }
    // Drapeau baissé.
    reinit({ drapeaux: { ...drapeaux, siteAchatPublic: false }, tables: { sites_commandes: [structuredClone(cmd)] } })
    { const r = await routeRenv.m.POST(poster(URL_RENVOYER, { commande: cmd.id })); if (r.status !== 404) e.push(`drapeau baissé → ${r.status}, 404 attendu`) }
    return { echecs: e, detail: `renvoyer : 200 {"ok":true} identique pour une commande payée (1 e-mail), inconnue (0) et en brouillon (0) ; un champ email du corps est ignoré ; 4 appels dans l'heure → 3 e-mails ; drapeau baissé → 404` }
  }, suivi)

  await jugerDans(res, 'AP-8', async () => {
    const e = []
    if (typeof achat.m?.purgerBrouillonsPublics !== 'function') return { echecs: [`${LIB_ACHAT} : purgerBrouillonsPublics absente (${achat.erreur ?? 'export absent'})`] }
    const six = ['commande_publique_payee', 'commande_autre_compte', 'brouillon_public_vieux', 'brouillon_public_recent', 'brouillon_avec_compte', 'payee_non_publique'].map((k) => structuredClone(C[k]))
    reinit({ tables: { sites_commandes: six } })
    try { await achat.m.purgerBrouillonsPublics() } catch (err) { e.push(`purgerBrouillonsPublics lève : ${premiereLigne(err)}`) }
    const restantes = lignes().map((l) => l.id).sort()
    const attendues = six.map((l) => l.id).filter((id) => id !== C.brouillon_public_vieux.id).sort()
    if (JSON.stringify(restantes) !== JSON.stringify(attendues)) e.push(`lignes restantes ${JSON.stringify(restantes)}, ${JSON.stringify(attendues)} attendues (seule ${C.brouillon_public_vieux.id} s'efface)`)
    return { echecs: e, detail: `purgerBrouillonsPublics sur 6 lignes (horloge au 2026-09-26) : seule ${C.brouillon_public_vieux.id} (brouillon, achat_public, sans compte, du 2026-09-10) est effacée` }
  }, suivi)

  resultatEnfant(JUGE, res)
} else {
  // ═══ Le juge ══════════════════════════════════════════════════════════════════════════════════════════════════════════
  if (o.inconnues.length || o.positionnels.length) refuserAppel(JUGE, `option(s) inconnue(s) : ${[...o.inconnues, ...o.positionnels].join(' ')}`)
  if (o.temoin && o.reel) refuserAppel(JUGE, '--temoin et --reel ne vont pas ensemble')
  if (o.reel && !o.racineParDefaut) refuserAppel(JUGE, '--reel se lance sur le dépôt, pas sur une copie')
  if (!fs.existsSync(RAC) || !fs.statSync(RAC).isDirectory()) refuserAppel(JUGE, `--racine introuvable : ${RAC}`)

  const rel = (p) => path.relative(R, p).split(path.sep).join('/') || '.'
  const mode = o.temoin ? 'témoin' : o.reel ? 'réel' : 'complet'
  const COMPLET = ['AP-1', 'AP-2', 'AP-3', 'AP-4', 'AP-5', 'AP-6', 'AP-7', 'AP-8', 'AP-9', 'AP-10', 'AP-11']
  const IDS = o.temoin ? ['AP-10', 'AP-PV'] : [...COMPLET, ...(o.reel ? ['AP-12'] : []), 'AP-PV']
  const s = creerSortie(JUGE, IDS, `${JUGE} — fiche ${FICHE}, racine ${rel(RAC)}, mode ${mode}`, { nr: ['AP-10'] })
  const src = (f) => sansCommentaires(lireRacine(RAC, f) ?? '')
  let suite = true

  if (!o.temoin) {
    await s.critere('AP-1', () => {
      const e = []
      const lib = lireRacine(RAC, LIB_ACHAT)
      if (lib === null) e.push(`${LIB_ACHAT} absent`)
      else for (const n of ['ouvrirCompteAcheteur', 'purgerBrouillonsPublics']) if (!exportsNommes(lib).includes(n)) e.push(`${LIB_ACHAT} n'exporte pas ${n}`)
      const srv = lireRacine(RAC, LIB_SRV)
      if (srv === null) e.push(`${LIB_SRV} absent`)
      else for (const n of ['parametresCheckoutSite', 'poserSessionStripePublique']) if (!exportsNommes(srv).includes(n)) e.push(`${LIB_SRV} n'exporte pas ${n}`)
      for (const f of [ROUTE_PUB, ROUTE_RENVOYER]) if (lireRacine(RAC, f) === null) e.push(`${f} absent`)
      return { echecs: e, detail: `${LIB_ACHAT} exporte ouvrirCompteAcheteur et purgerBrouillonsPublics ; ${LIB_SRV} exporte parametresCheckoutSite et poserSessionStripePublique ; les deux routes publiques existent` }
    })
    suite = !s.enEchec('AP-1')
    if (!suite) s.nonJuges(COMPLET.filter((id) => !['AP-1', 'AP-10'].includes(id)), 'AP-1 en échec')
  }

  if (!o.temoin && suite) {
    // La partie « source » d'AP-2 et d'AP-4, puis l'enfant.
    const eSrc = { 'AP-2': [], 'AP-4': [], 'AP-8': [] }
    {
      const avec = src(ROUTE_AVEC_COMPTE), pub = src(ROUTE_PUB)
      for (const [nom, t] of [[ROUTE_AVEC_COMPTE, avec], [ROUTE_PUB, pub]]) {
        if (!/\bparametresCheckoutSite\s*\(/.test(t)) eSrc['AP-2'].push(`${nom} n'appelle pas parametresCheckoutSite(`)
        for (const mot of ['invoice_creation', 'line_items', 'unit_amount']) if (new RegExp(`\\b${mot}\\b`).test(t)) eSrc['AP-2'].push(`${nom} contient ${mot} (le constructeur seul les porte)`)
      }
      // L'ordre se lit dans le corps de POST (une constante déclarée en tête de fichier n'est pas une étape).
      const corpsPost = corpsDeFonction(pub, 'POST')?.corps ?? pub
      const pos = (re) => { const m = re.exec(corpsPost); return m ? m.index : -1 }
      const ordre = [['actif(', pos(/\bactif\s*\(/)], ['isBanned(', pos(/\bisBanned\s*\(/)], ['website', pos(/\bwebsite\b/)], ['consommerLimite(', pos(/\bconsommerLimite\s*\(/)], ['cgu', pos(/\bcgu\b/)], ['insert(', pos(/\.insert\s*\(/)]]
      for (const [nom, p] of ordre) if (p < 0) eSrc['AP-4'].push(`${ROUTE_PUB} : ${nom} introuvable`)
      for (let i = 1; i < ordre.length; i++) if (ordre[i][1] >= 0 && ordre[i - 1][1] >= 0 && ordre[i][1] < ordre[i - 1][1]) eSrc['AP-4'].push(`${ROUTE_PUB} : ${ordre[i][0]} vient avant ${ordre[i - 1][0]} (ordre attendu : ${ordre.map((x) => x[0]).join(' < ')})`)
      if (/\bauthArtisan\b/.test(pub) || importsDe(lireRacine(RAC, ROUTE_PUB) ?? '').some((i) => /authArtisan/.test(i.spec))) eSrc['AP-4'].push(`${ROUTE_PUB} appelle authArtisan : une route publique n'a pas de session`)
      const liv = src(LIB_LIVRAISON)
      if (!liv) eSrc['AP-8'].push(`${LIB_LIVRAISON} absent`)
      else if (!/\btry\s*\{[^{}]*\bpurgerBrouillonsPublics\s*\(/.test(liv)) eSrc['AP-8'].push(`${LIB_LIVRAISON} n'appelle pas purgerBrouillonsPublics( dans son propre try`)
    }
    const enfant = lancerEnfant({ juge: JUGE, script: CE_SCRIPT, racine: RAC, mode: 'complet', timeout: 240_000, env: { STRIPE_WEBHOOK_SECRET: SECRET_WEBHOOK } })
    for (const id of ['AP-2', 'AP-3', 'AP-4', 'AP-5', 'AP-6', 'AP-7', 'AP-8']) {
      const c = enfant.res?.criteres?.[id]
      const e = [...(eSrc[id] ?? []), ...(c?.echecs ?? [])]
      if (!c) e.push(`l'enfant n'a rien rendu pour ${id} (code ${enfant.code}${enfant.erreur ? `, ${enfant.erreur}` : ''}) — ${court(enfant.sortie?.trim().split(/\r?\n/).filter((l) => !l.startsWith('@@')).slice(-2).join(' | ') ?? '', 200)}`)
      const prefixe = id === 'AP-2' ? 'source : les deux routes appellent parametresCheckoutSite(, sans invoice_creation, line_items ni unit_amount ; ' : id === 'AP-4' ? `source : actif( < isBanned( < website < consommerLimite( < cgu < insert(, sans authArtisan ; ` : id === 'AP-8' ? `${LIB_LIVRAISON} appelle purgerBrouillonsPublics( dans un try ; ` : ''
      s.juger(id, e, `${prefixe}${c?.detail ?? ''}`)
    }

    await s.critere('AP-9', () => {
      const e = []
      const flags = lireRacine(RAC, LIB_FLAGS) ?? ''
      if (!/^\s*siteAchatPublic\s*:\s*false\s*,?\s*$/m.test(flags)) e.push(`${LIB_FLAGS} ne porte pas siteAchatPublic: false`)
      const cur = lireRacine(RAC, FERMETURE)
      if (cur === null) return { echecs: [...e, `${FERMETURE} absent`] }
      const LIGNE = /'siteAchatPublic'\s*:\s*\[\s*'route'\s*,\s*'\/api\/site\/commander\/public'\s*,\s*'POST'\s*,\s*'app\/api\/site\/commander\/public\/route\.ts'\s*,\s*'app\/api\/site\/commander\/public\/renvoyer\/route\.ts'\s*\]/
      if (!LIGNE.test(cur)) e.push(`${FERMETURE} : la ligne de la carte 'siteAchatPublic': ['route', '/api/site/commander/public', 'POST', …/public/route.ts, …/renvoyer/route.ts] manque`)
      const base = baseAvant(FERMETURE, /siteAchatPublic/)
      if (base.texte === null) e.push(`${FERMETURE} : aucune version sans siteAchatPublic dans l'historique`)
      else {
        const d = diffLignes(base.texte, cur)
        for (const x of d.retraits.filter((l) => l.texte.trim())) e.push(`${FERMETURE} (base ${base.commit.slice(0, 7)}) : ligne ${x.i + 1} retirée ou changée : « ${court(x.texte, 70)} »`)
        const ajouts = d.ajouts.filter((l) => l.texte.trim() && !/^\s*\/\//.test(l.texte))
        if (ajouts.length !== 1 || !/siteAchatPublic/.test(ajouts[0].texte)) e.push(`${FERMETURE} (base ${base.commit.slice(0, 7)}) : ${ajouts.length} ligne(s) de code ajoutée(s) (${ajouts.slice(0, 3).map((l) => `« ${court(l.texte, 50)} »`).join(', ')}), seule la ligne siteAchatPublic attendue`)
      }
      const bloc = /export\s+const\s+FLAGS\s*=\s*\{([\s\S]*?)\}\s*as\s+const/.exec(flags)
      const drapeaux = bloc ? [...bloc[1].matchAll(/^\s*([A-Za-z_]\w*)\s*:\s*(?:true|false)\b/gm)].map((m) => m[1]) : []
      if (!drapeaux.length) e.push(`${LIB_FLAGS} : FLAGS illisible`)
      const carte = /const\s+CARTE\s*=\s*\{([\s\S]*?)\n\s*\}/.exec(sansCommentaires(cur))
      const cles = carte ? [...carte[1].matchAll(/'([A-Za-z_]\w*)'\s*:\s*\[/g)].map((m) => m[1]) : []
      if (!cles.length) e.push(`${FERMETURE} : CARTE illisible`)
      for (const f of drapeaux) if (!cles.includes(f)) e.push(`${FERMETURE} : le drapeau ${f} de FLAGS n'est pas dans la carte`)
      return { echecs: e, detail: `${LIB_FLAGS} porte siteAchatPublic: false ; ${FERMETURE} porte la ligne de la carte, seule ligne ajoutée depuis ${base.commit?.slice(0, 7)} ; les ${drapeaux.length} drapeaux de FLAGS sont tous dans la carte` }
    })
    await s.critere('AP-11', () => { const r = typecheck(RAC, JUGE); return { echecs: r.ok ? [] : [r.detail], detail: r.detail } })
  }

  {
    await s.critere('AP-10', () => {
      const e = []
      for (const f of INCHANGES) e.push(...differentsDeHead(RAC, f).map((x) => `${x} (interdit à 026-025)`))
      let sous = 'webhook-muet-qa non relancé (racine ≠ dépôt : il ne juge que le dépôt)'
      if (o.racineParDefaut) {
        const r = lancer(process.execPath, ['scripts/webhook-muet-qa.mjs'], { timeout: 600_000 })
        const derniere = r.sortie.trim().split(/\r?\n/).filter(Boolean).at(-1) ?? ''
        if (r.code !== 0) e.push(`scripts/webhook-muet-qa.mjs : code ${r.code}${r.erreur ? ` (${r.erreur})` : ''} — ${court(r.sortie.split(/\r?\n/).find((l) => l.startsWith('❌') || /FAIL/.test(l)) ?? derniere, 140)}`)
        sous = `scripts/webhook-muet-qa.mjs → code ${r.code} (« ${court(derniere, 60)} », ${r.duree.toFixed(0)} s)`
      }
      return { echecs: e, detail: `${INCHANGES.join(', ')} inchangés depuis HEAD ; ${sous}` }
    })
  }

  // ── AP-12 (--reel) ─────────────────────────────────────────────────────────────────────────────────────────────────────
  if (o.reel) {
    if (!fichePass(FICHE)) { s.echoue('AP-12', `préalable absent : la fiche ${FICHE} n'est pas PASS (routes non déployées)`); s.finir(); process.exit(2) }
    chargerEnvLocal()
    const manque = ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'].filter((k) => !process.env[k])
    if (manque.length) { s.echoue('AP-12', `préalable absent : ${manque.join(', ')} (.env.local)`); s.finir(); process.exit(2) }
    const BASE = (process.env.PRESTI_BASE_URL || 'https://prestiapp.fr').replace(/\/$/, '')
    const e = []
    const menage = []
    let detail = ''
    try {
      const sonde = await fetch(`${BASE}/api/site/commander/public`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
      if (sonde.status === 404) {
        const r2 = await fetch(`${BASE}/api/site/commander/public/renvoyer`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' })
        if (r2.status !== 404) e.push(`drapeau baissé : POST /api/site/commander/public/renvoyer → ${r2.status}, 404 attendu`)
        detail = `drapeau baissé sur ${BASE} : POST /api/site/commander/public → 404, /renvoyer → ${r2.status}`
      } else {
        const { default: Stripe } = await import('stripe')
        const { createClient } = await import('@supabase/supabase-js')
        const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 0 })
        const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
        const marque = marqueEssai()
        const email = `${marque}@presti-test.invalid`
        const r = await fetch(`${BASE}/api/site/commander/public`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email, entreprise: `Essai ${marque}`, metier: 'Plombier', commune: 'Marans', cgu: true }) })
        const corps = await r.json().catch(() => ({}))
        if (r.status !== 200 || typeof corps.url !== 'string') throw new Error(`POST public → ${r.status} ${court(JSON.stringify(corps), 100)}`)
        const cs = /cs_(?:test|live)_[A-Za-z0-9]+/.exec(corps.url)?.[0]
        if (!cs) throw new Error(`aucun identifiant cs_… dans l'adresse rendue (${court(corps.url, 60)})`)
        const { data: cmd } = await admin.from('sites_commandes').select('id, etat, stripe_session_id, artisan_id, achat_public').eq('email', email).maybeSingle()
        if (!cmd) throw new Error('commande introuvable en base après le POST public')
        menage.push(async () => { const { error } = await admin.from('sites_commandes').delete().eq('id', cmd.id); if (error) throw new Error(`ménage de la commande ${cmd.id} : ${error.message}`) })
        await stripe.checkout.sessions.expire(cs).catch((err) => e.push(`expiration de ${cs} : ${premiereLigne(err)}`))
        if (cmd.stripe_session_id !== cs) e.push(`stripe_session_id = ${cmd.stripe_session_id}, ${cs} attendu`)
        if (cmd.artisan_id !== null || cmd.achat_public !== true || cmd.etat !== 'brouillon') e.push(`commande créée : artisan_id ${cmd.artisan_id}, achat_public ${cmd.achat_public}, etat ${cmd.etat}`)
        const PRIX = Number(/PRIX_SITE_CENTS\s*=\s*(\d+)/.exec(lireRacine(RAC, LIB_SITE) ?? '')?.[1] ?? 30000)
        const ev = { id: `evt_sim_${crypto.randomBytes(12).toString('hex')}`, object: 'event', api_version: '2025-08-27.basil', created: Math.floor(Date.now() / 1000), livemode: false, pending_webhooks: 1, request: { id: null, idempotency_key: null }, type: 'checkout.session.completed', data: { object: { id: cs, object: 'checkout.session', mode: 'payment', status: 'complete', payment_status: 'paid', livemode: false, amount_total: PRIX, currency: 'eur', customer: null, customer_details: { email }, client_reference_id: null, metadata: { type: 'commande_site', commande_id: cmd.id, achat: 'public' }, payment_intent: `pi_sim_${crypto.randomBytes(8).toString('hex')}` } } }
        const payload = JSON.stringify(ev)
        const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: process.env.STRIPE_WEBHOOK_SECRET })
        const w1 = await fetch(`${BASE}/api/stripe/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body: payload })
        if (w1.status !== 200) e.push(`webhook simulé → ${w1.status}, 200 attendu`)
        const trouverUtilisateur = async () => { for (let page = 1; page <= 20; page++) { const { data } = await admin.auth.admin.listUsers({ page, perPage: 1000 }); const u = data?.users?.find((x) => (x.email ?? '').toLowerCase() === email); if (u) return u; if (!data?.users?.length || data.users.length < 1000) return null } return null }
        const u = await trouverUtilisateur()
        if (!u) e.push('aucun utilisateur créé pour l\'adresse d\'essai')
        else menage.push(async () => { const { error } = await admin.auth.admin.deleteUser(u.id); if (error) throw new Error(`ménage de l'utilisateur ${u.id} : ${error.message}`) })
        const { data: apres } = await admin.from('sites_commandes').select('etat, lien_envoye_le, lien_envois').eq('id', cmd.id).maybeSingle()
        if (apres?.etat !== 'payee') e.push(`après le webhook : etat ${apres?.etat}, payee attendu`)
        if (!apres?.lien_envoye_le) e.push('après le webhook : lien_envoye_le vide')
        const w2 = await fetch(`${BASE}/api/stripe/webhook`, { method: 'POST', headers: { 'content-type': 'application/json', 'stripe-signature': signature }, body: payload })
        const { data: rejeu } = await admin.from('sites_commandes').select('lien_envois').eq('id', cmd.id).maybeSingle()
        if (w2.status !== 200 || rejeu?.lien_envois !== apres?.lien_envois) e.push(`rejeu → ${w2.status}, lien_envois ${apres?.lien_envois} → ${rejeu?.lien_envois} (rien de neuf attendu)`)
        detail = `drapeau levé sur ${BASE} : POST public (${email}) → session ${cs} expirée ; webhook simulé signé → payee, utilisateur créé, lien_envoye_le posé ; rejeu → rien de neuf ; ménage fait`
      }
    } catch (err) { e.push(`interrompu : ${premiereLigne(err)}`) } finally {
      for (const m of menage.reverse()) { try { await m() } catch (err) { e.push(premiereLigne(err)) } }
    }
    s.juger('AP-12', e, detail)
  }

  jugerPreuvesVides(s, 'AP', RAC, FICHE)
  process.exit(s.finir())
}
