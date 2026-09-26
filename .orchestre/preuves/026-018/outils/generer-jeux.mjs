// Générateur des jeux d'essai du lot A (026-018) : écrit a/commandes.json, a/dns.json, a/tva.json, a/jeux.json.
// Les attendus de tva.json sont calculés en ÉVALUANT les lignes recopiées du commit de référence.
import fs from 'node:fs'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

const R = 'C:/Users/benja/Documents/presti'
const D = path.join(R, 'scripts/fixtures/026-livraison-tresor/a')
const REF = '4041ec9b41432576037dbc0b45e0647bd60a0347'
const ecrire = (n, o) => fs.writeFileSync(path.join(D, n), JSON.stringify(o, null, 1) + '\n')
const id = (n) => `7a018000-0000-4000-8000-${String(n).padStart(12, '0')}`

// ── tva.json ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const route = execFileSync('git', ['show', `${REF}:app/api/controle/compta/route.ts`], { cwd: R, encoding: 'utf8' }).replace(/\r\n/g, '\n').split('\n')
const l72 = route.slice(71, 74), l89 = route.slice(88, 91)
const corps = `${l72.join('\n')}\nreturn {\n${l89.join('\n')}\n}`
const formule = new Function('reg', 'caCents', `${corps.replace('return {', 'return { seuil, seuilMajore, alerteA,')}`)
const R0 = { tva_seuil_franchise_cents: 3750000, tva_seuil_majore_cents: 4125000, tva_alerte_pourcent: 80 }
const cas = [
  ['seuil nul', 1000000, { ...R0, tva_seuil_franchise_cents: 0 }],
  ['chiffre d’affaires inconnu', null, R0],
  ['pile au seuil', 3750000, R0],
  ['pile à 80 %', 3000000, R0],
  ['un centime sous 80 % (le pourcentage arrondi dit 80, l’alerte ne part pas)', 2999999, R0],
  ['chiffre d’affaires nul', 0, R0],
  ['au-delà du seuil majoré', 4200000, R0],
  ['réglages en texte, alerte à 90 %', 3400000, { tva_seuil_franchise_cents: '3750000', tva_seuil_majore_cents: '4125000', tva_alerte_pourcent: '90' }],
  ['alerte réglée à 0 : 80 par défaut', 3000000, { ...R0, tva_alerte_pourcent: 0 }],
  ['aucun réglage en base', 3000000, {}],
  ['réglage illisible', 3000000, { tva_seuil_franchise_cents: 'abc', tva_seuil_majore_cents: 'abc', tva_alerte_pourcent: 'abc' }],
  ['arrondi au dixième', 1234567, R0],
]
ecrire('tva.json', {
  _lisez: 'Jeu d’essai de TR-2 (026-055, situerTva) : 12 cas. L’attendu est calculé par la formule de app/api/controle/compta/route.ts:72-74 et :89-91 au commit de référence, recopiée ci-dessous telle quelle ; tresorerie-qa la compare au commit de référence et la réévalue avant de juger.',
  reference: REF,
  fichier: 'app/api/controle/compta/route.ts',
  lignes_72_74: l72,
  lignes_89_91: l89,
  cas: cas.map(([nom, caCents, reglages]) => ({ nom, caCents, reglages, attendu: formule(reglages, caCents) })),
})

// ── dns.json ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
const DNS = {
  'plomberie-temoin.fr': [
    { type: 'A', name: '@', value: '76.76.21.21' },
    { type: 'TXT', name: '_vercel', value: 'vc-domain-verify=plomberie-temoin.fr,temoin026018' },
  ],
  'www.menuiserie-temoin.fr': [{ type: 'CNAME', name: 'www', value: 'cname.vercel-dns.com' }],
}
ecrire('dns.json', { _lisez: 'Enregistrements DNS factices au format DnsRecord (lib/vercelDomains.ts:10), servis par la doublure de getStatus (livraison-tour-qa, TL-3 et TL-4).', domaines: DNS })

// ── commandes.json ───────────────────────────────────────────────────────────────────────────────────────────────────────
const matiere = (n, complet = true) => ({
  artisan: { prenom: `Jeanne${n}`, nom: `Temoinette${n}`, installation: 2012, parcours: 'Compagnonne du devoir, plombière à Villeurbanne depuis 2012.', citation: 'Je réponds moi-même à chaque demande de dépannage.', chiffres: null },
  photos: complet ? [1, 2, 3].map((k) => ({ url: `https://exemple.invalid/chantier-${n}-${k}.webp`, role: 'chantier' })) : [],
  adresse: '12 rue du Témoin, 69100 Villeurbanne', siren: '732829320', horaires: 'Du lundi au vendredi, 8 h à 18 h',
  decennale: { assureur: 'Assureur Témoin', numero: `DEC-TEMOIN-${n}` },
})
const ligne = (n, etat, extra = {}) => ({
  id: id(n), artisan_id: null, email: `commande.${n}@presti-test.invalid`, etat,
  domaine_mode: 'aucun', domaine: null, metier: 'Plombier', metiers_secondaires: [], communes: ['Villeurbanne', 'Lyon 3e'],
  matiere: matiere(n), prix_cents: 30000, devise: 'eur', stripe_session_id: etat === 'brouillon' ? null : `cs_test_temoin_${n}`, stripe_payment_intent_id: null,
  paye_le: etat === 'brouillon' ? null : '2026-10-05T08:00:00.000Z', genere_le: ['generee', 'validee', 'en_ligne', 'retiree'].includes(etat) ? '2026-10-06T08:00:00.000Z' : null,
  apercu_jeton: null, scores: null, verifications: null, consigne: null, regenerations: 0,
  valide_le: ['validee', 'en_ligne', 'retiree'].includes(etat) ? '2026-10-07T08:00:00.000Z' : null, en_ligne_le: ['en_ligne', 'retiree'].includes(etat) ? '2026-10-08T08:00:00.000Z' : null,
  cree_le: '2026-10-01T08:00:00.000Z', modifie_le: '2026-10-08T08:00:00.000Z',
  entreprise: `Plomberie Témoin ${n}`, achat_public: false, cgu_acceptees_le: null, lien_envoye_le: null, lien_envois: 0, rattachee_le: null,
  courriels: {}, search_console_le: null, compte_supprime_le: null, retiree_le: etat === 'retiree' ? '2026-10-09T08:00:00.000Z' : null,
  dossier_jeton_hash: null, dossier_expire_le: null, dossier_envoye_le: null, fichiers_purges_le: null,
  generation_demandee_le: null, generation_tentatives: 0, generation_duree_s: null,
  ...extra,
})
const T = '2026-10-05T09:00:00.000Z'
// maintenant des retards : mercredi 14/10/2026, 12 h à Paris (10 h UTC).
const retards = [
  ligne(40, 'payee', { paye_le: '2026-10-12T08:00:00.000Z' }), // lundi 10 h Paris → 50 h ouvrées : retard
  ligne(41, 'payee', { paye_le: '2026-10-14T06:00:00.000Z' }), // mercredi 8 h Paris → 4 h : à jour
  ligne(42, 'payee', { paye_le: '2026-10-05T08:00:00.000Z', matiere: matiere(42, false) }), // dossier incomplet : pas une fabrication en retard
  ligne(43, 'generee', { genere_le: '2026-10-12T06:00:00.000Z' }), // lundi 8 h Paris → 52 h : retard
  ligne(44, 'generee', { genere_le: '2026-10-13T12:00:00.000Z' }), // mardi 14 h Paris → 22 h : à jour
  ligne(45, 'validee', { valide_le: '2026-10-09T08:00:00.000Z' }), // vendredi 10 h Paris → 74 h : retard (48 h)
  ligne(46, 'validee', { valide_le: '2026-10-12T12:00:00.000Z' }), // lundi 14 h Paris → 46 h : à jour
  ligne(47, 'en_ligne'), ligne(48, 'brouillon', { cree_le: '2026-09-01T08:00:00.000Z' }), ligne(49, 'retiree'),
]
ecrire('commandes.json', {
  _lisez: 'Lignes sites_commandes factices (colonnes de 0088 et de 0103, 026-021), adresses @presti-test.invalid, noms « Témoin ». Lues par livraison-tour-qa (TL-2 à TL-7), tresorerie-qa et tuile-argent-qa (ventes des sites).',
  etats: { payee: ligne(1, 'payee'), generee: ligne(2, 'generee'), validee: ligne(3, 'validee'), en_ligne: ligne(4, 'en_ligne') },
  courriels_dus: [
    { nom: 'brouillon', commande: ligne(10, 'brouillon'), attendu: [] },
    { nom: 'payée jamais prévenue', commande: ligne(11, 'payee'), attendu: ['payee'] },
    { nom: 'payée déjà prévenue', commande: ligne(12, 'payee', { courriels: { payee: T } }), attendu: [] },
    { nom: 'générée jamais prévenue', commande: ligne(13, 'generee'), attendu: ['payee', 'generee'] },
    { nom: 'validée, « payée » déjà parti', commande: ligne(14, 'validee', { courriels: { payee: T } }), attendu: ['generee'] },
    { nom: 'en ligne jamais prévenue', commande: ligne(15, 'en_ligne'), attendu: ['payee', 'en_ligne'] },
    { nom: 'en ligne, tout est parti', commande: ligne(16, 'en_ligne', { courriels: { payee: T, generee: T, en_ligne: T } }), attendu: [] },
    { nom: 'retirée', commande: ligne(17, 'retiree'), attendu: [] },
  ],
  gabarits: {
    payee: ligne(20, 'payee'), generee: ligne(21, 'generee'),
    en_ligne_existant: ligne(22, 'en_ligne', { domaine_mode: 'existant', domaine: 'plomberie-temoin.fr' }),
    en_ligne_a_prendre: ligne(23, 'en_ligne', { domaine_mode: 'a_prendre', domaine: 'menuiserie-temoin.fr' }),
    en_ligne_aucun: ligne(24, 'en_ligne'),
  },
  idempotence: ligne(30, 'en_ligne', { domaine_mode: 'existant', domaine: 'plomberie-temoin.fr' }),
  retards: {
    maintenant: '2026-10-14T10:00:00.000Z',
    lignes: retards,
    attendus: [`retard:${id(40)}:payee`, `retard:${id(43)}:generee`, `retard:${id(45)}:validee`],
    complets: [id(40), id(41), id(43), id(44), id(45), id(46), id(47), id(48), id(49)],
    incomplets: [id(42)],
  },
  ventes_tuile: [ligne(50, 'payee'), ligne(51, 'generee'), ligne(52, 'en_ligne'), ligne(53, 'retiree'), ligne(54, 'brouillon')],
})

// ── jeux.json ────────────────────────────────────────────────────────────────────────────────────────────────────────────
const marge = [
  ['cas nominal', { net: 250, brut: 260, frais: 10, paiements: 2 }, 4990, 12.34, { recettesNettes: 250, depenses: 62.24, marge: 187.76, estimation: false }],
  ['0,30 − 0,10 : piège des flottants', { net: 0.3, brut: 0.3, frais: 0, paiements: 1 }, 10, 0, { recettesNettes: 0.3, depenses: 0.1, marge: 0.2, estimation: false }],
  ['coût IA absent (null) : compté 0, estimation', { net: 100, brut: 100, frais: 0, paiements: 1 }, 0, null, { recettesNettes: 100, depenses: 0, marge: 100, estimation: true }],
  ['coût IA non fourni : compté 0, estimation', { net: 100, brut: 100, frais: 0, paiements: 1 }, 0, 'absent', { recettesNettes: 100, depenses: 0, marge: 100, estimation: true }],
  ['marge négative', { net: 0, brut: 0, frais: 0, paiements: 0 }, 30000, 1.1, { recettesNettes: 0, depenses: 301.1, marge: -301.1, estimation: false }],
  ['centimes partout', { net: 1234.56, brut: 1270, frais: 35.44, paiements: 5 }, 12345, 0.07, { recettesNettes: 1234.56, depenses: 123.52, marge: 1111.04, estimation: false }],
  ['19,99 − 9,99 : piège des flottants', { net: 19.99, brut: 20.5, frais: 0.51, paiements: 1 }, 999, 0, { recettesNettes: 19.99, depenses: 9.99, marge: 10, estimation: false }],
  ['coût IA au millième : arrondi au centime', { net: 50, brut: 50, frais: 0, paiements: 1 }, 0, 3.333, { recettesNettes: 50, depenses: 3.33, marge: 46.67, estimation: false }],
]
const L = (etat, prix = 30000) => ({ etat, prix_cents: prix })
const zero = { payee: 0, generee: 0, validee: 0, en_ligne: 0, retiree: 0 }
const ventes = [
  ['aucune commande', [], { ...zero, encaisseCents: 0 }],
  ['un brouillon est ignoré', [L('brouillon')], { ...zero, encaisseCents: 0 }],
  ['une commande payée', [L('payee')], { ...zero, payee: 1, encaisseCents: 30000 }],
  ['un de chaque état payé', [L('payee'), L('generee'), L('validee'), L('en_ligne')], { payee: 1, generee: 1, validee: 1, en_ligne: 1, retiree: 0, encaisseCents: 120000 }],
  ['une retirée est comptée', [L('retiree'), L('en_ligne')], { ...zero, en_ligne: 1, retiree: 1, encaisseCents: 60000 }],
  ['deux prix différents, un brouillon', [L('payee'), L('payee', 25000), L('brouillon')], { ...zero, payee: 2, encaisseCents: 55000 }],
  ['un état inconnu est ignoré', [L('inconnu'), L('validee', 29999)], { ...zero, validee: 1, encaisseCents: 29999 }],
  ['mélange', [L('en_ligne'), L('en_ligne'), L('en_ligne'), L('retiree'), L('brouillon'), L('brouillon')], { ...zero, en_ligne: 3, retiree: 1, encaisseCents: 120000 }],
]
const seuilTva = (ca) => formule(R0, ca)
ecrire('jeux.json', {
  _lisez: 'Jeux d’essai chiffrés du lot A (026-018). marge et ventes : TR-4 (026-055) ; stripe : TR-3 et TA-3 ; heures : TL-6 (026-024) ; veille : TA-4 (026-059) ; tuile : TA-3 et TA-6.',
  marge: {
    _contrat: 'margeDuMois({ encaisse, achatsMoisCents, coutIaEur }) → { recettesNettes, depenses, marge, estimation }. Montants en EUROS arrondis au centime, calculés en centimes entiers (aucune soustraction de flottants hors centimes) : recettesNettes = encaisse.net ; depenses = achats du mois + coût IA ; marge = recettesNettes − depenses ; estimation vraie dès que le coût IA est absent (compté 0). coutIaEur « absent » = clé non fournie.',
    cas: marge.map(([nom, encaisse, achatsMoisCents, coutIaEur, attendu]) => ({ nom, encaisse, achatsMoisCents, coutIaEur, attendu })),
  },
  ventes: {
    _contrat: 'ventesSites(lignes) → { payee, generee, validee, en_ligne, retiree, encaisseCents } : nombre de commandes par état et somme de prix_cents des commandes payées ou plus loin (retiree comprise). Brouillons et états inconnus ignorés. Acceptés aussi : les comptes sous « parEtat », le total sous « totalCents ».',
    cas: ventes.map(([nom, lignes, attendu]) => ({ nom, lignes, attendu })),
  },
  stripe: {
    _lisez: 'Le jeu fixe que rend la doublure de Stripe (balanceTransactions.list, invoices.list, subscriptions.list). Horloge figée des juges : 2026-10-14T09:30:00Z.',
    maintenant: '2026-10-14T09:30:00.000Z',
    transactions: [
      { id: 'txn_temoin_1', type: 'charge', currency: 'eur', amount: 30000, fee: 475, net: 29525, created: 1760000000 },
      { id: 'txn_temoin_2', type: 'payment', currency: 'eur', amount: 9900, fee: 164, net: 9736, created: 1760100000 },
      { id: 'txn_temoin_3', type: 'refund', currency: 'eur', amount: -2000, fee: 0, net: -2000, created: 1760200000 },
      { id: 'txn_temoin_4', type: 'charge', currency: 'usd', amount: 5000, fee: 175, net: 4825, created: 1760300000 },
      { id: 'txn_temoin_5', type: 'stripe_fee', currency: 'eur', amount: -150, fee: 0, net: -150, created: 1760400000 },
    ],
    factures: [
      { id: 'in_temoin_1', status: 'paid', amount_paid: 30000, created: 1760000000 },
      { id: 'in_temoin_2', status: 'paid', amount_paid: 9900, created: 1760100000 },
      { id: 'in_temoin_3', status: 'paid', amount_paid: 1234567, created: 1760200000 },
    ],
    abonnements: [
      { id: 'sub_temoin_1', status: 'active', metadata: { plan: 'pro' }, pause_collection: null, items: { data: [{ quantity: 1, price: { unit_amount: 9900, recurring: { interval: 'month' } } }] } },
      { id: 'sub_temoin_2', status: 'active', metadata: { plan: 'expert' }, pause_collection: null, items: { data: [{ quantity: 1, price: { unit_amount: 190800, recurring: { interval: 'year' } } }] } },
    ],
  },
  achats: [
    { id: id(90), fournisseur: 'Hébergeur Témoin', libelle: 'hébergement', categorie: 'hebergement', date_facture: '2026-10-02', ht_cents: 1990, tva_cents: 0, ttc_cents: 1990, payee: true },
    { id: id(91), fournisseur: 'Domaine Témoin', libelle: 'domaine', categorie: 'domaine', date_facture: '2026-10-13', ht_cents: 1200, tva_cents: 0, ttc_cents: 1200, payee: true },
    { id: id(92), fournisseur: 'Mois dernier', libelle: 'hors du mois', categorie: 'autre', date_facture: '2026-09-30', ht_cents: 5000, tva_cents: 0, ttc_cents: 5000, payee: true },
    { id: id(93), fournisseur: 'Année dernière', libelle: 'hors de l’année', categorie: 'autre', date_facture: '2025-10-10', ht_cents: 7000, tva_cents: 0, ttc_cents: 7000, payee: true },
  ],
  reglages: [
    { cle: 'tva_seuil_franchise_cents', valeur: 3750000 }, { cle: 'tva_seuil_majore_cents', valeur: 4125000 }, { cle: 'tva_alerte_pourcent', valeur: 80 },
  ],
  heures: {
    _contrat: 'heuresOuvreesEntre(a: Date, b: Date) → heures du lundi au vendredi, heure de Paris.',
    cas: [
      { nom: 'du vendredi 12 h au lundi 12 h', a: '2026-10-09T10:00:00.000Z', b: '2026-10-12T10:00:00.000Z', attendu: 24 },
      { nom: 'du lundi 0 h au mercredi 0 h', a: '2026-10-11T22:00:00.000Z', b: '2026-10-13T22:00:00.000Z', attendu: 48 },
      { nom: 'du vendredi 23/10 12 h au lundi 26/10 12 h, passage à l’heure d’hiver le dimanche 25/10', a: '2026-10-23T10:00:00.000Z', b: '2026-10-26T11:00:00.000Z', attendu: 24 },
    ],
  },
  veille: {
    _contrat: 'alertesTresorerie(tva, maintenant) → Alerte[] ; tva a la forme rendue par situerTva.',
    cas: [
      { nom: 'lundi 0 h 30 à Paris (dimanche en UTC), 80 %', maintenant: '2026-10-11T22:30:00.000Z', tva: seuilTva(3000000), attendu: 'alerte' },
      { nom: 'lundi 12 h à Paris, seuil dépassé', maintenant: '2026-10-12T10:00:00.000Z', tva: seuilTva(3800000), attendu: 'depasse' },
      { nom: 'mardi 0 h 30 à Paris (lundi en UTC), 90 %', maintenant: '2026-10-12T22:30:00.000Z', tva: seuilTva(3375000), attendu: null },
      { nom: 'lundi 12 h à Paris, 79 %', maintenant: '2026-10-12T10:00:00.000Z', tva: seuilTva(2962500), attendu: null },
      { nom: 'lundi 12 h à Paris, chiffre inconnu', maintenant: '2026-10-12T10:00:00.000Z', tva: seuilTva(null), attendu: null },
    ],
    changements: ['prix', 'mentions légales', 'STRIPE_TAXE_AUTO'],
  },
})
console.log('jeux écrits dans', D)
