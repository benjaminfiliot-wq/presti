#!/usr/bin/env node
// scripts/sms-qa.mjs — juge de l'adaptateur SMS à blanc (plan du chantier 4 §11, lot L7, tâche 032-024).
//
// Hors ligne, sans base, sans fournisseur, sans compte : un FOURNISSEUR FACTICE et un MAGASIN EN MÉMOIRE. `fetch` est remplacé par une
// fonction qui lève : un seul appel, et la suite rougit. Sweego n'est JAMAIS importé ni appelé (lecture de son source seulement).
//
// Les 13 cas (R5 §9 n'est pas dans le dépôt — scratchpad de la nuit du 02/11 —, ils sont tirés du plan §11, porte par porte) :
//   1 drapeau baissé = rien du tout · 2 à blanc : simulé, estimation, rien ne sort · 3 type hors liste · 4 pause, interrupteur, doute ·
//   5 offre et geste · 6 numéro mobile de métropole · 7 numéro donné pour ce chantier · 8 expéditeur · 9 GSM-7 et segments ·
//   10 pas de lien (et le lien `sms:` de l'étape 0) · 11 ni montant ni menace · 12 plage, fériés, heure de Paris ·
//   13 idempotence, plafonds, disjoncteur, envoi « incertain » jamais renvoyé.
// Quatre compléments : 14 un SMS sans STOP est refusé · 15 tarif null = pas d'envoi réel · 16 hors plage = refusé · 17 opposition = refusé.
// Puis les MUTANTS : chaque mutation d'une copie de lib/sms/ doit faire rougir au moins un cas.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/sms-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

process.removeAllListeners('warning')
const RACINE = process.cwd()
const SMS = path.join(RACINE, 'lib', 'sms')
const MUTANTS = path.join(RACINE, '.orchestre', 'preuves', '032-024', 'mutants')

let appelsFetch = 0
const fetchReel = globalThis.fetch
globalThis.fetch = () => { appelsFetch++; throw new Error('SMS-QA : un appel réseau a été tenté') }

const importer = (dir, f) => import(pathToFileURL(path.join(dir, f)).href)

// ── Données de test : AUCUNE donnée réelle. 07 35 46 xx xx = plage de fiction des mobiles (à revérifier auprès de l'ARCEP).
const TEXTE = 'Bonjour, rappel de votre rendez-vous demain à 14h. Répondez STOP pour ne plus recevoir de SMS.'
const MARDI_10H = () => new Date('2026-11-03T09:00:00Z') // mardi 3 nov. 2026, 10 h à Paris (CET, UTC+1)
const demandeBase = (o = {}) => ({
  artisanId: 'art-test-1', plan: 'signature', gesteArtisan: true, type: 'rappel_rdv', clientId: 'cli-test-1',
  telephone: '07 35 46 00 01', telSource: 'donne_pour_chantier', nomArtisan: 'Dupont Bois', texte: TEXTE, reference: 'rdv-test-1', ...o,
})
const TARIFS_TEST = { factice: { prixSegmentHt: 0.05, source: 'valeur de TEST, pas un tarif', releveLe: null } } // jamais un prix de fournisseur

async function jouer(dir, bavard) {
  const rouges = []
  let verts = 0
  const ok = (nom, cond, detail = '') => {
    if (cond) verts++
    else rouges.push(nom)
    if (bavard) console.log(`${cond ? 'PASS' : 'FAIL'} ${nom}${cond || !detail ? '' : ' — ' + String(detail).slice(0, 300)}`)
  }
  const cas = async (nom, f) => {
    if (bavard) console.log(`\n— ${nom}`)
    try { await f() } catch (e) { ok(`${nom} : exception`, false, e?.stack || e) }
  }
  const env = await importer(dir, 'envoyer.ts')
  const enc = await importer(dir, 'encodage.ts')
  const exp = await importer(dir, 'expediteur.ts')
  const num = await importer(dir, 'numero.ts')
  const plg = await importer(dir, 'plage.ts')
  const lien = await importer(dir, 'lien.ts')
  const tar = await importer(dir, 'tarifs.ts')
  const fac = await importer(dir, 'fournisseurs/factice.ts')
  const ctr = await importer(dir, 'contrat.ts')
  const { envoyerSms } = env

  const depsBase = (o = {}) => ({
    drapeau: () => true, smsArret: async () => false, sortiePermise: async () => ({ permise: true }),
    magasin: fac.creerMagasinMemoire(), maintenant: MARDI_10H, ...o,
  })
  const refuse = (r, porte, raison) => r.etat === 'refuse' && r.porte === porte && r.raison === raison
  const reelDeps = (o = {}) => depsBase({ fournisseur: fac.creerFournisseurFactice('accepte'), tarifs: TARIFS_TEST, coutApprouve: 0.05, disjoncteurOuvert: async () => false, ...o })

  await cas('1. drapeau baissé = rien du tout', async () => {
    let lectures = 0
    const f = fac.creerFournisseurFactice('accepte')
    const r = await envoyerSms(demandeBase(), { drapeau: () => false, smsArret: async () => { lectures++; return false }, sortiePermise: async () => { lectures++; return { permise: true } }, magasin: { opposition: async () => { lectures++; return false }, etatDeLaCle: async () => { lectures++; return null }, reserver: async () => { lectures++; return true }, marquer: async () => { lectures++ }, compteursDuJour: async () => { lectures++; return { artisan: 0, total: 0, segmentsTotal: 0 } } }, fournisseur: f })
    ok('1a drapeau baissé : refus porte 1', refuse(r, 1, 'drapeau_baisse'), JSON.stringify(r))
    ok('1b aucune lecture, aucun appel fournisseur', lectures === 0 && f.appels.length === 0, `${lectures} lectures`)
    const r2 = await envoyerSms(demandeBase({ mode: 'reel' }), { drapeau: () => false, fournisseur: f })
    ok('1c même en réel : rien', r2.etat === 'refuse' && f.appels.length === 0)
    const r3 = await envoyerSms(demandeBase())
    ok('1d sans aucune dépendance : le vrai drapeau est baissé', refuse(r3, 1, 'drapeau_baisse'), JSON.stringify(r3))
    ok('1e lib/flags.ts : smsClients est false', /smsClients:\s*false/.test(fs.readFileSync(path.join(RACINE, 'lib', 'flags.ts'), 'utf8')))
  })

  await cas('2. à blanc : simulé, estimation calculée par le code, rien ne sort', async () => {
    const f = fac.creerFournisseurFactice('leve')
    const m = fac.creerMagasinMemoire()
    const avant = appelsFetch
    const r = await envoyerSms(demandeBase(), depsBase({ magasin: m, fournisseur: f }))
    ok('2a état simulé', r.etat === 'simule', JSON.stringify(r))
    ok('2b un segment, GSM-7', r.estimation?.segments === 1 && r.estimation?.encodage === 'gsm7', JSON.stringify(r.estimation))
    ok('2c tarif null → coût « inconnu », jamais 0', r.estimation?.coutEtat === 'inconnu' && r.estimation?.coutHt === null, JSON.stringify(r.estimation))
    ok('2d expéditeur validé et numéro E.164', r.expediteur === 'Dupont Bois' && r.destinataire === '+33735460001', `${r.expediteur} ${r.destinataire}`)
    ok('2e le fournisseur n\'est pas appelé, `fetch` jamais touché', f.appels.length === 0 && appelsFetch === avant)
    ok('2f à blanc, rien n\'est écrit', m.etats.size === 0)
    const r2 = await envoyerSms(demandeBase({ texte: TEXTE + ' Merci.' }), depsBase({ tarifs: TARIFS_TEST, fournisseur: fac.creerFournisseurFactice('accepte') }))
    ok('2g tarif connu (valeur de test) → coût = segments × prix, calculé par le code', r2.etat === 'simule' && r2.estimation.coutHt === 0.05 && r2.estimation.coutEtat === 'connu', JSON.stringify(r2))
  })

  await cas('3. type hors liste fermée', async () => {
    ok('3a la liste est exactement rappel_rdv, devis_pret, rappel_paiement', JSON.stringify(ctr.TYPES_SMS) === JSON.stringify(['rappel_rdv', 'devis_pret', 'rappel_paiement']))
    for (const t of ['promo', 'prospection', 'relance_commerciale', '', undefined, 42]) {
      const r = await envoyerSms(demandeBase({ type: t }), depsBase())
      ok(`3b « ${String(t)} » refusé`, refuse(r, 1, 'type_inconnu'), JSON.stringify(r))
    }
    for (const t of ctr.TYPES_SMS) {
      const r = await envoyerSms(demandeBase({ type: t }), depsBase())
      ok(`3c « ${t} » passe à blanc`, r.etat === 'simule', JSON.stringify(r))
    }
  })

  await cas('4. pause générale, interrupteur sms_arret, doute', async () => {
    ok('4a pause active', refuse(await envoyerSms(demandeBase(), depsBase({ sortiePermise: async () => ({ permise: false }) })), 1, 'pause'))
    ok('4b lecture de la pause qui lève', refuse(await envoyerSms(demandeBase(), depsBase({ sortiePermise: async () => { throw new Error('x') } })), 1, 'pause_doute'))
    ok('4c sms_arret posé', refuse(await envoyerSms(demandeBase(), depsBase({ smsArret: async () => true })), 1, 'sms_arret'))
    ok('4d sms_arret illisible', refuse(await envoyerSms(demandeBase(), depsBase({ smsArret: async () => { throw new Error('x') } })), 1, 'interrupteur_doute'))
    ok('4e sms_arret absent = doute', refuse(await envoyerSms(demandeBase(), depsBase({ smsArret: undefined })), 1, 'interrupteur_doute'))
    ok('4f sms_arret qui rend autre chose que false = arrêt', refuse(await envoyerSms(demandeBase(), depsBase({ smsArret: async () => null })), 1, 'sms_arret'))
  })

  await cas('5. offre (peut(plan, \'assistant\')) et geste de l\'artisan', async () => {
    ok('5a plan gratuit : refusé', refuse(await envoyerSms(demandeBase({ plan: 'gratuit' }), depsBase()), 2, 'offre'))
    ok('5b plan inconnu : refusé', refuse(await envoyerSms(demandeBase({ plan: 'nimporte' }), depsBase()), 2, 'offre'))
    ok('5c sans geste de l\'artisan : refusé même en Signature', refuse(await envoyerSms(demandeBase({ gesteArtisan: false }), depsBase()), 2, 'geste_absent'))
    ok('5d Studio avec geste : passe', (await envoyerSms(demandeBase({ plan: 'studio' }), depsBase())).etat === 'simule')
  })

  await cas('6. mobile de métropole, en E.164', async () => {
    for (const bon of ['07 35 46 00 01', '0735460001', '+33 7 35 46 00 01', '0033 7 35 46 00 01', '+33 (0)7 35 46 00 01', '07.35.46.00.01', '06 12 34 56 78'])
      ok(`6a accepté : ${bon}`, num.normaliserMobileMetropole(bon) === (bon.includes('06 12') ? '+33612345678' : '+33735460001'), String(num.normaliserMobileMetropole(bon)))
    for (const mauvais of ['01 23 45 67 89', '04 91 00 00 00', '09 12 34 56 78', '08 05 12 34 56', '0700 00 00 00', '06 90 12 34 56', '06 94 12 34 56', '06 39 12 34 56', '+44 7911 123456', '+1 202 555 0100', '0735460', '', 'abc', null, undefined])
      ok(`6b refusé : ${String(mauvais)}`, num.normaliserMobileMetropole(mauvais) === null)
    const r = await envoyerSms(demandeBase({ telephone: '04 91 00 00 00' }), depsBase())
    ok('6c un fixe est refusé à la porte 3', refuse(r, 3, 'numero_non_mobile_metropole'), JSON.stringify(r))
  })

  await cas('7. numéro donné pour ce chantier (tel_source)', async () => {
    for (const s of ['import_csv', 'achete', '', null, undefined])
      ok(`7a « ${String(s)} » refusé`, refuse(await envoyerSms(demandeBase({ telSource: s }), depsBase()), 3, 'numero_hors_chantier'))
    ok('7b « donne_pour_chantier » passe', (await envoyerSms(demandeBase(), depsBase())).etat === 'simule')
  })

  await cas('8. expéditeur = le nom de l\'artisan, jamais « Presti »', async () => {
    for (const n of ['Presti', 'Presti Menuiserie', 'PRESTI', 'P r e s t i', 'Ma Presti Bois', 'prestí'])
      ok(`8a « ${n} » refusé`, refuse(await envoyerSms(demandeBase({ nomArtisan: n }), depsBase()), 4, 'expediteur_marque_presti'), n)
    ok('8b nom vide', refuse(await envoyerSms(demandeBase({ nomArtisan: '  ' }), depsBase()), 4, 'expediteur_vide'))
    ok('8c trop court', refuse(await envoyerSms(demandeBase({ nomArtisan: 'Al' }), depsBase()), 4, 'expediteur_trop_court'))
    ok('8d que des chiffres', refuse(await envoyerSms(demandeBase({ nomArtisan: '1234 5678' }), depsBase()), 4, 'expediteur_numerique'))
    const v = exp.validerExpediteur('Éts Léon & Fils Électricité')
    ok('8e accents retirés, 11 caractères au plus, alphanumérique', v.ok && v.valeur === 'Ets Leon Fi' && /^[A-Za-z0-9 ]{3,11}$/.test(v.valeur), JSON.stringify(v))
    const r = await envoyerSms(demandeBase({ nomArtisan: 'Dupont Bois' }), depsBase())
    ok('8f l\'expéditeur rendu est celui de l\'artisan', r.expediteur === 'Dupont Bois')
  })

  await cas('9. GSM-7 pur et segments', async () => {
    ok('9a le texte type est en GSM-7, 1 segment', enc.mesurer(TEXTE).encodage === 'gsm7' && enc.mesurer(TEXTE).segments === 1)
    ok('9b « ç » minuscule fait basculer en UCS-2', enc.mesurer('français').encodage === 'ucs2' && enc.mesurer('français').horsAlphabet.includes('ç'))
    ok('9c « ê », « ô », « œ », emoji : UCS-2', ['êtes', 'hôtel', 'sœur', 'ok 👍'].every((t) => enc.mesurer(t).encodage === 'ucs2'))
    ok('9d « é è ù à ì ò Ç » sont dans la table', enc.estGsm7Pur('é è ù à ì ò Ç'))
    ok('9e 160 septets = 1 segment, 161 = 2', enc.mesurer('a'.repeat(160)).segments === 1 && enc.mesurer('a'.repeat(161)).segments === 2)
    ok('9f 306 = 2 segments, 307 = 3 (chaînés à 153)', enc.mesurer('a'.repeat(306)).segments === 2 && enc.mesurer('a'.repeat(307)).segments === 3)
    ok('9g UCS-2 : 70 = 1 segment, 71 = 2', enc.mesurer('ç'.repeat(70)).segments === 1 && enc.mesurer('ç'.repeat(71)).segments === 2)
    ok('9h l\'extension compte double (« { » = 2 septets) et n\'est pas « pur »', enc.mesurer('{').unites === 2 && !enc.estGsm7Pur('{') && !enc.estGsm7Pur('€'))
    ok('9i versGsm7 ramène « français ê œ » à l\'alphabet', enc.estGsm7Pur(enc.versGsm7('français, êtes-vous sœur ?')))
    ok('9j un texte en « ç » est refusé à la porte 5', refuse(await envoyerSms(demandeBase({ texte: 'Bonjour, ce garçon passe demain. STOP pour arrêter.' }), depsBase()), 5, 'non_gsm7'))
    ok('9k plus d\'un segment : refusé', refuse(await envoyerSms(demandeBase({ texte: TEXTE + ' ' + 'a'.repeat(80) }), depsBase()), 5, 'trop_long'))
  })

  await cas('10. pas de lien — et le lien `sms:` de l\'étape 0', async () => {
    for (const t of ['Voir https://exemple.test/x STOP', 'Voir www.exemple.test STOP', 'Voir exemple.fr STOP', 'Voir bit.ly/abc STOP', 'Voir ma-page.com STOP'])
      ok(`10a refusé : ${t}`, refuse(await envoyerSms(demandeBase({ texte: t }), depsBase()), 5, 'lien'), t)
    const l = lien.lienSms('07 35 46 00 01', TEXTE)
    ok('10b lien sms: RFC 5724 : sms:+E164?body=…', l.ok && l.lien.startsWith('sms:+33735460001?body=') && decodeURIComponent(l.lien.split('?body=')[1]) === TEXTE, JSON.stringify(l))
    ok('10c le lien ne laisse passer ni espace ni saut de ligne bruts', l.ok && !/[ \n\r]/.test(l.lien))
    ok('10d numéro non mobile : pas de lien', lien.lienSms('04 91 00 00 00', TEXTE).raison === 'numero')
    ok('10e sans STOP : pas de lien', lien.lienSms('07 35 46 00 01', 'Bonjour, rendez-vous demain.').raison === 'stop_absent')
    ok('10f avec un lien dans le texte : pas de lien sms:', lien.lienSms('07 35 46 00 01', 'Voir https://x.test STOP').raison === 'lien')
  })

  await cas('11. ni montant ni menace', async () => {
    for (const t of ['Votre facture de 120 euros est due. STOP', 'Reste 120€ à payer. STOP', 'Total 45 EUR. STOP', 'Merci de régler. € STOP'])
      ok(`11a montant refusé : ${t}`, refuse(await envoyerSms(demandeBase({ type: 'rappel_paiement', texte: t }), depsBase()), 5, 'montant'), t)
    for (const t of ['Sans règlement, un huissier sera saisi. STOP', 'Mise en demeure de payer. STOP', 'Dernière chance de payer. STOP', 'Poursuites engagées. STOP'])
      ok(`11b menace refusée : ${t}`, refuse(await envoyerSms(demandeBase({ type: 'rappel_paiement', texte: t }), depsBase()), 5, 'menace'), t)
    const ok1 = await envoyerSms(demandeBase({ type: 'rappel_paiement', texte: 'Bonjour, un petit rappel pour votre facture, merci de nous contacter. STOP pour ne plus recevoir.' }), depsBase())
    ok('11c un rappel courtois, sans montant, passe', ok1.etat === 'simule', JSON.stringify(ok1))
  })

  await cas('12. plage : lundi-samedi, 8 h-20 h Paris, hors fériés', async () => {
    const v = (iso) => plg.verifierPlage(new Date(iso))
    ok('12a mardi 10 h', v('2026-11-03T09:00:00Z').ok === true)
    ok('12b samedi 8 h 00 : ouvert', v('2026-11-07T07:00:00Z').ok === true)
    ok('12c samedi 7 h 59 : fermé', v('2026-11-07T06:59:00Z').raison === 'hors_horaire')
    ok('12d samedi 19 h 59 : ouvert, 20 h 00 : fermé', v('2026-11-07T18:59:00Z').ok === true && v('2026-11-07T19:00:00Z').raison === 'hors_horaire')
    ok('12e dimanche : fermé', v('2026-11-08T09:00:00Z').raison === 'dimanche')
    ok('12f 11 novembre (mercredi) : férié', v('2026-11-11T09:00:00Z').raison === 'ferie')
    ok('12g 14 juillet 2026, Noël, 1er mai, 15 août (samedi) : fériés', ['2026-07-14T08:00:00Z', '2026-12-25T09:00:00Z', '2026-05-01T08:00:00Z', '2026-08-15T08:00:00Z'].every((i) => v(i).raison === 'ferie'))
    ok('12h lundi de Pâques 2026 (6 avr.), Ascension (14 mai), lundi de Pentecôte (25 mai)', ['2026-04-06T08:00:00Z', '2026-05-14T08:00:00Z', '2026-05-25T08:00:00Z'].every((i) => v(i).raison === 'ferie'))
    ok('12i Pâques calculé : 2026 → 5 avril, 2027 → 28 mars, 2028 → 16 avril', JSON.stringify([plg.paques(2026), plg.paques(2027), plg.paques(2028)]) === JSON.stringify([[4, 5], [3, 28], [4, 16]]))
    ok('12j heure d\'été : 06 h 30 UTC en juillet = 8 h 30 à Paris → ouvert', v('2026-07-07T06:30:00Z').ok === true)
    ok('12k heure d\'hiver : 06 h 30 UTC en janvier = 7 h 30 à Paris → fermé', v('2027-01-12T06:30:00Z').raison === 'hors_horaire')
    ok('12l minuit passé à Paris (23 h 30 UTC) : fermé, pas de « 24 h »', v('2026-11-03T23:30:00Z').raison === 'hors_horaire')
    ok('12m date invalide : fermé', v('pas une date').ok === false)
  })

  await cas('13. idempotence, plafonds, disjoncteur, « incertain » jamais renvoyé', async () => {
    const d = (o) => demandeBase({ mode: 'reel', ...o })
    // envoi réel (fournisseur FACTICE) : une fois, pas deux
    { const f = fac.creerFournisseurFactice('accepte'); const m = fac.creerMagasinMemoire(); const dp = reelDeps({ fournisseur: f, magasin: m })
      const r1 = await envoyerSms(d(), dp); const r2 = await envoyerSms(d(), dp)
      ok('13a premier envoi réel (factice) : envoyé', r1.etat === 'envoye' && f.appels.length === 1, JSON.stringify(r1))
      ok('13b même clé : refusé, un seul appel fournisseur', refuse(r2, 6, 'doublon') && f.appels.length === 1, JSON.stringify(r2))
      ok('13c le message part avec le nom de l\'artisan et sa clé', f.appels[0]?.expediteur === 'Dupont Bois' && f.appels[0]?.cleIdempotence === r1.cle) }
    // incertain : réponse incertaine OU exception → jamais renvoyé
    for (const comportement of ['incertain', 'leve']) {
      const f = fac.creerFournisseurFactice(comportement); const m = fac.creerMagasinMemoire(); const dp = reelDeps({ fournisseur: f, magasin: m })
      const r1 = await envoyerSms(d(), dp); const r2 = await envoyerSms(d(), dp); const r3 = await envoyerSms(d(), reelDeps({ fournisseur: fac.creerFournisseurFactice('accepte'), magasin: m }))
      ok(`13d ${comportement} : état incertain rendu`, r1.etat === 'incertain', JSON.stringify(r1))
      ok(`13e ${comportement} : jamais renvoyé (même avec un fournisseur sain)`, refuse(r2, 6, 'incertain_non_renvoye') && refuse(r3, 6, 'incertain_non_renvoye') && f.appels.length === 1)
    }
    { const m = fac.creerMagasinMemoire(); m.etats.set('sms:art-test-1:cli-test-1:rappel_rdv:rdv-test-1', { etat: 'en_cours', artisanId: 'art-test-1', segments: 1 })
      const f = fac.creerFournisseurFactice('accepte')
      ok('13f une clé « en_cours » (crash après réservation) n\'est pas renvoyée', refuse(await envoyerSms(d(), reelDeps({ magasin: m, fournisseur: f })), 6, 'incertain_non_renvoye') && f.appels.length === 0) }
    { const f = fac.creerFournisseurFactice('refuse'); const r = await envoyerSms(d(), reelDeps({ fournisseur: f }))
      ok('13g refus net du fournisseur : refusé, tracé', refuse(r, 6, 'fournisseur_refuse'), JSON.stringify(r)) }
    // plafonds
    { const m = fac.creerMagasinMemoire(); const f = fac.creerFournisseurFactice('accepte'); const dp = reelDeps({ magasin: m, fournisseur: f })
      let envoyes = 0
      for (let i = 0; i < 10; i++) if ((await envoyerSms(d({ reference: `rdv-${i}` }), dp)).etat === 'envoye') envoyes++
      const onze = await envoyerSms(d({ reference: 'rdv-10' }), dp)
      ok('13h 10 SMS par artisan et par jour, le 11e est refusé', envoyes === 10 && refuse(onze, 6, 'plafond_artisan') && f.appels.length === 10, JSON.stringify(onze))
      const autre = await envoyerSms(d({ artisanId: 'art-test-2', reference: 'rdv-a' }), dp)
      ok('13i un autre artisan n\'est pas bloqué par le premier', autre.etat === 'envoye', JSON.stringify(autre)) }
    { const m = fac.creerMagasinMemoire(); for (let i = 0; i < 100; i++) m.etats.set(`x${i}`, { etat: 'envoye', artisanId: `autre-${i}`, segments: 1 })
      ok('13j 100 SMS en tout par jour', refuse(await envoyerSms(d(), reelDeps({ magasin: m })), 6, 'plafond_total')) }
    { const m = fac.creerMagasinMemoire(); m.etats.set('gros', { etat: 'envoye', artisanId: 'autre', segments: 200 })
      ok('13k 8 € HT par jour au plus (valeurs de test)', refuse(await envoyerSms(d(), reelDeps({ magasin: m })), 6, 'plafond_euros')) }
    { const m = fac.creerMagasinMemoire(); m.panne.compteurs = true
      ok('13l compteurs illisibles : fail-closed', refuse(await envoyerSms(d(), reelDeps({ magasin: m })), 6, 'plafond_doute'))
      const m2 = fac.creerMagasinMemoire(); m2.compteursDuJour = async () => ({ artisan: Number.NaN, total: 0, segmentsTotal: 0 })
      ok('13m compteur absurde (NaN) : fail-closed', refuse(await envoyerSms(d(), reelDeps({ magasin: m2 })), 6, 'plafond_doute'))
      const m3 = fac.creerMagasinMemoire(); m3.panne.etatDeLaCle = true
      ok('13n idempotence illisible : fail-closed', refuse(await envoyerSms(d(), reelDeps({ magasin: m3 })), 6, 'idempotence_doute'))
      const m4 = fac.creerMagasinMemoire(); m4.panne.reserver = true; const f = fac.creerFournisseurFactice('accepte')
      ok('13o réservation impossible : rien ne part', refuse(await envoyerSms(d(), reelDeps({ magasin: m4, fournisseur: f })), 6, 'idempotence_doute') && f.appels.length === 0) }
    // disjoncteur
    { const f = fac.creerFournisseurFactice('accepte')
      ok('13p disjoncteur ouvert : refusé', refuse(await envoyerSms(d(), reelDeps({ fournisseur: f, disjoncteurOuvert: async () => true })), 6, 'disjoncteur'))
      ok('13q disjoncteur illisible : fail-closed', refuse(await envoyerSms(d(), reelDeps({ fournisseur: f, disjoncteurOuvert: async () => { throw new Error('x') } })), 6, 'disjoncteur_doute'))
      ok('13r disjoncteur absent : fail-closed', refuse(await envoyerSms(d(), reelDeps({ fournisseur: f, disjoncteurOuvert: undefined })), 6, 'disjoncteur_doute') && f.appels.length === 0) }
    // deux demandes en même temps, même clé : la réservation est atomique, un seul envoi
    { const f = fac.creerFournisseurFactice('accepte'); const dp = reelDeps({ fournisseur: f })
      const [a, b] = await Promise.all([envoyerSms(d(), dp), envoyerSms(d(), dp)])
      ok('13t deux demandes simultanées, même clé : un seul envoi', [a, b].filter((x) => x.etat === 'envoye').length === 1 && f.appels.length === 1, JSON.stringify([a, b])) }
    // fournisseur lent : incertain, jamais renvoyé
    { const lent = { nom: 'factice', appels: [], envoyer: () => new Promise(() => {}) }; const m = fac.creerMagasinMemoire()
      const r = await envoyerSms(d(), reelDeps({ fournisseur: lent, magasin: m, delaiFournisseurMs: 20 }))
      ok('13s délai dépassé : incertain, clé gardée', r.etat === 'incertain' && m.etats.get(r.cle)?.etat === 'incertain', JSON.stringify(r)) }
  })

  await cas('14. un SMS sans STOP est refusé', async () => {
    for (const t of ['Bonjour, rappel de votre rendez-vous demain à 14h.', 'Rappel de rendez-vous. STOPPE ou pas', 'Rappel. Arrêtez les SMS', '', '   '])
      ok(`14a refusé : « ${t} »`, ['stop_absent', 'vide'].includes((await envoyerSms(demandeBase({ texte: t }), depsBase())).raison), t)
    ok('14b « Stop » et « stop » comptent, « STOPPE » non', enc.porteStop('Stop') && enc.porteStop('répondez stop.') && !enc.porteStop('stoppé') && !enc.porteStop('unstop'))
    ok('14c le refus est à la porte 5, avant toute écriture', refuse(await envoyerSms(demandeBase({ texte: 'Rappel de rendez-vous demain.' }), depsBase()), 5, 'stop_absent'))
    ok('14d en réel aussi : le fournisseur n\'est pas appelé', await (async () => { const f = fac.creerFournisseurFactice('accepte'); const r = await envoyerSms(demandeBase({ mode: 'reel', texte: 'Rappel de rendez-vous demain.' }), reelDeps({ fournisseur: f })); return r.etat === 'refuse' && f.appels.length === 0 })())
  })

  await cas('15. tarif null = pas d\'envoi réel', async () => {
    ok('15a SMS_COUT_APPROUVE vaut null', tar.SMS_COUT_APPROUVE === null)
    ok('15b tous les tarifs du dépôt sont null (aucun prix inventé)', Object.values(tar.TARIFS).every((t) => t.prixSegmentHt === null && t.source === null && t.releveLe === null))
    ok('15c estimerCout : tarif null → inconnu', JSON.stringify(tar.estimerCout('sweego', 1)) === JSON.stringify({ coutHt: null, coutEtat: 'inconnu' }))
    const f = fac.creerFournisseurFactice('accepte')
    ok('15d réel avec les VRAIS défauts (coût non approuvé) : refusé, rien ne part', refuse(await envoyerSms(demandeBase({ mode: 'reel' }), depsBase({ fournisseur: f, disjoncteurOuvert: async () => false })), 6, 'cout_non_approuve') && f.appels.length === 0)
    ok('15e coût approuvé mais tarif null : refusé', refuse(await envoyerSms(demandeBase({ mode: 'reel' }), depsBase({ fournisseur: f, coutApprouve: 0.05, disjoncteurOuvert: async () => false })), 6, 'cout_non_approuve'))
    ok('15f tarif sourcé mais coût non approuvé : refusé', refuse(await envoyerSms(demandeBase({ mode: 'reel' }), depsBase({ fournisseur: f, tarifs: TARIFS_TEST, coutApprouve: null, disjoncteurOuvert: async () => false })), 6, 'cout_non_approuve'))
    ok('15g tarif supérieur au coût approuvé : refusé', refuse(await envoyerSms(demandeBase({ mode: 'reel' }), depsBase({ fournisseur: f, tarifs: TARIFS_TEST, coutApprouve: 0.01, disjoncteurOuvert: async () => false })), 6, 'cout_superieur_a_l_approuve'))
    ok('15h coût approuvé NaN / négatif / chaîne : refusé', await (async () => { for (const c of [Number.NaN, -1, 0, '0.05']) { if ((await envoyerSms(demandeBase({ mode: 'reel' }), depsBase({ fournisseur: f, tarifs: TARIFS_TEST, coutApprouve: c, disjoncteurOuvert: async () => false }))).etat !== 'refuse') return false } return f.appels.length === 0 })())
    ok('15i réel sans fournisseur : refusé', refuse(await envoyerSms(demandeBase({ mode: 'reel' }), depsBase({ tarifs: { sweego: TARIFS_TEST.factice }, coutApprouve: 0.05, disjoncteurOuvert: async () => false })), 6, 'fournisseur_absent'))
  })

  await cas('16. hors plage = refusé', async () => {
    for (const [iso, raison] of [['2026-11-08T09:00:00Z', 'dimanche'], ['2026-11-11T09:00:00Z', 'ferie'], ['2026-11-03T06:59:00Z', 'hors_horaire'], ['2026-11-03T19:00:00Z', 'hors_horaire'], ['2026-04-06T08:00:00Z', 'ferie']]) {
      const f = fac.creerFournisseurFactice('accepte')
      ok(`16a ${iso} → ${raison}`, refuse(await envoyerSms(demandeBase({ mode: 'reel' }), reelDeps({ maintenant: () => new Date(iso), fournisseur: f })), 5, raison) && f.appels.length === 0, iso)
    }
  })

  await cas('17. opposition = refusé', async () => {
    const m = fac.creerMagasinMemoire(); m.oppositions.add('+33735460001')
    ok('17a numéro opposé : refusé à la porte 3', refuse(await envoyerSms(demandeBase(), depsBase({ magasin: m })), 3, 'opposition'))
    ok('17b quelle que soit la façon de l\'écrire', refuse(await envoyerSms(demandeBase({ telephone: '+33 7 35 46 00 01' }), depsBase({ magasin: m })), 3, 'opposition') && refuse(await envoyerSms(demandeBase({ telephone: '0033735460001' }), depsBase({ magasin: m })), 3, 'opposition'))
    const f = fac.creerFournisseurFactice('accepte')
    ok('17c en réel aussi : rien ne part', (await envoyerSms(demandeBase({ mode: 'reel' }), reelDeps({ magasin: m, fournisseur: f }))).raison === 'opposition' && f.appels.length === 0)
    const m2 = fac.creerMagasinMemoire(); m2.panne.opposition = true
    ok('17d opposition illisible : fail-closed', refuse(await envoyerSms(demandeBase(), depsBase({ magasin: m2 })), 3, 'opposition_doute'))
    ok('17e sans magasin : fail-closed', refuse(await envoyerSms(demandeBase(), depsBase({ magasin: undefined })), 3, 'opposition_doute'))
    const m3 = fac.creerMagasinMemoire(); m3.opposition = async () => 'non'
    ok('17f réponse qui n\'est pas exactement false : refusé', refuse(await envoyerSms(demandeBase(), depsBase({ magasin: m3 })), 3, 'opposition'))
    ok('17g un autre numéro n\'est pas touché', (await envoyerSms(demandeBase({ telephone: '07 35 46 00 02' }), depsBase({ magasin: m }))).etat === 'simule')
  })

  await cas('18. le code : Sweego jamais appelé, aucun réseau, aucun secret', async () => {
    const lire = (f) => fs.readFileSync(path.join(dir, f), 'utf8')
    const sw = lire('fournisseurs/sweego.ts')
    ok('18a sweego : forme non vérifiée, donc fermé', /^export const FORME_VERIFIEE = false$/m.test(sw) && /if \(!FORME_VERIFIEE\) return/.test(sw))
    ok('18b sweego : la clé n\'est jamais écrite en dur, le fetch est injecté', !/sk-|Bearer\s+[A-Za-z0-9]{12,}/.test(sw) && !/(^|[^.\w])fetch\(/m.test(sw))
    const autres = ['contrat.ts', 'encodage.ts', 'expediteur.ts', 'numero.ts', 'plage.ts', 'lien.ts', 'envoyer.ts', 'tarifs.ts', 'fournisseurs/factice.ts']
    ok('18c aucun autre fichier n\'importe Sweego', autres.every((f) => !/(import|from|require)[^\n]*sweego/i.test(lire(f))))
    ok('18d aucun autre fichier n\'appelle le réseau', autres.every((f) => !/(^|[^.\w])fetch\(|XMLHttpRequest|node:https?|node:net/.test(lire(f))))
    ok('18e aucun secret en clair', [...autres, 'fournisseurs/sweego.ts'].every((f) => !/(sk-[A-Za-z0-9]{10,}|AKIA[A-Z0-9]{12,}|eyJ[A-Za-z0-9_-]{20,})/.test(lire(f))))
    ok('18f aucun numéro réel : seule la plage de fiction 07 35 46 apparaît dans les sources', autres.every((f) => !/(?<![\d])(?!(\+33|0)7[\s.]?35[\s.]?46)(\+33|0)[67][\s.]?\d{2}[\s.]?\d{2}[\s.]?\d{2}[\s.]?\d{2}(?!\d)/.test(lire(f))))
  })

  return { rouges, verts }
}

// ── Les MUTANTS : une copie de lib/sms/ par mutation ; au moins un cas doit rougir ───────────────────────────────────────────
const MUTATIONS = [
  { nom: 'STOP retiré', f: 'encodage.ts', de: "if (!porteStop(texte)) return 'stop_absent'", vers: '' },
  { nom: 'plage ouverte (toute heure)', f: 'plage.ts', de: 'if (t.heure >= HEURE_OUVERTURE && t.heure < HEURE_FERMETURE) return { ok: true }', vers: 'return { ok: true }' },
  { nom: 'dimanche permis', f: 'plage.ts', de: "if (t.jourSemaine === 0) return { ok: false, raison: 'dimanche' }", vers: '' },
  { nom: 'fériés ignorés', f: 'plage.ts', de: 'joursFeries(t.annee).has(cle(t.mois, t.jour))', vers: 'false' },
  { nom: 'lundi de Pâques oublié', f: 'plage.ts', de: 'decale(1), // lundi de Pâques', vers: '' },
  { nom: 'heure de Paris remplacée par UTC+1 en dur', f: 'plage.ts', de: "timeZone: 'Europe/Paris'", vers: "timeZone: 'Etc/GMT-1'" },
  { nom: 'plafond par artisan ignoré', f: 'envoyer.ts', de: "if (c.artisan + 1 > PLAFOND_ARTISAN_JOUR) return refus(6, 'plafond_artisan', cle)", vers: '' },
  { nom: 'plafond total ignoré', f: 'envoyer.ts', de: "if (c.total + 1 > PLAFOND_TOTAL_JOUR) return refus(6, 'plafond_total', cle)", vers: '' },
  { nom: 'plafond ouvert quand le compteur est illisible', f: 'envoyer.ts', de: "} catch { return refus(6, 'plafond_doute', cle) }", vers: '} catch { /* ouvert */ }' },
  { nom: 'expéditeur « Presti » accepté', f: 'expediteur.ts', de: "if (/p\\s*r\\s*e\\s*s\\s*t\\s*i/i.test(nu)) return { ok: false, raison: 'marque_presti' }", vers: '' },
  { nom: 'tarif null n\'arrête plus le réel', f: 'envoyer.ts', de: "if (!prixValide(approuve) || !prixValide(prixTarif)) return refus(6, 'cout_non_approuve')", vers: '' },
  { nom: 'opposition ignorée', f: 'envoyer.ts', de: "if ((await magasin.opposition(destinataire)) !== false) return refus(3, 'opposition')", vers: '' },
  { nom: 'envoi « incertain » renvoyé', f: 'envoyer.ts', de: "if (etat === 'incertain' || etat === 'en_cours') return refus(6, 'incertain_non_renvoye', cle)", vers: '' },
  { nom: 'réservation atomique ignorée', f: 'envoyer.ts', de: "if (!(await magasin.reserver(cle, demande.artisanId, mesure.segments))) return refus(6, 'doublon', cle)", vers: 'await magasin.reserver(cle, demande.artisanId, mesure.segments)' },
  { nom: 'drapeau ignoré', f: 'envoyer.ts', de: "if (!(deps.drapeau ?? (() => actif('smsClients')))()) return refus(1, 'drapeau_baisse')", vers: '' },
  { nom: 'à blanc qui sort', f: 'envoyer.ts', de: "if (!reel) return { etat: 'simule', cle, estimation, expediteur: exp.valeur, destinataire }", vers: '' },
  { nom: 'geste de l\'artisan ignoré', f: 'envoyer.ts', de: "if (demande.gesteArtisan !== true) return refus(2, 'geste_absent')", vers: '' },
  { nom: 'GSM-7 « pur » laxiste', f: 'encodage.ts', de: 'export const estGsm7Pur = (texte: string): boolean => Array.from(texte).every((c) => SET_BASE.has(c))', vers: 'export const estGsm7Pur = (_texte: string): boolean => true' },
  { nom: 'lien permis', f: 'encodage.ts', de: "if (contientLien(texte)) return 'lien'", vers: '' },
  { nom: 'montant permis', f: 'encodage.ts', de: "if (contientMontant(texte)) return 'montant'", vers: '' },
  { nom: 'menace permise', f: 'encodage.ts', de: "if (contientMenace(texte)) return 'menace'", vers: '' },
  { nom: 'segments : 160 septets comptés pour 2', f: 'encodage.ts', de: 'unites <= 160 ? 1', vers: 'unites <= 159 ? 1' },
  { nom: 'numéro fixe accepté', f: 'numero.ts', de: 'if (!/^0[67][0-9]{8}$/.test(national)) return null', vers: 'if (!/^0[1-9][0-9]{8}$/.test(national)) return null' },
  { nom: 'outre-mer accepté', f: 'numero.ts', de: "if (national.startsWith('06') && OUTRE_MER.test(national.slice(1))) return null", vers: '' },
  { nom: 'numéro non donné pour le chantier accepté', f: 'envoyer.ts', de: "if (!(TEL_SOURCES_ADMISES as readonly unknown[]).includes(demande.telSource)) return refus(3, 'numero_hors_chantier')", vers: '' },
  { nom: 'pause générale ignorée', f: 'envoyer.ts', de: "if (!s || s.permise !== true) return refus(1, 'pause')", vers: '' },
  { nom: 'disjoncteur absent = ouvert', f: 'envoyer.ts', de: "if (!deps.disjoncteurOuvert || (await deps.disjoncteurOuvert()) !== false)", vers: 'if (deps.disjoncteurOuvert && (await deps.disjoncteurOuvert()) !== false)' },
  { nom: 'exception du fournisseur prise pour un échec rejouable', f: 'envoyer.ts', de: "await magasin.marquer(cle, 'incertain').catch(() => {}) // le SMS est peut-être parti : la clé reste prise, jamais renvoyé", vers: "await magasin.marquer(cle, 'echec').catch(() => {})" },
  { nom: 'sweego ouvert sans forme vérifiée', f: 'fournisseurs/sweego.ts', de: 'export const FORME_VERIFIEE = false', vers: 'export const FORME_VERIFIEE = true' },
  { nom: 'lien sms: sans contrôle du texte', f: 'lien.ts', de: 'if (refus) return { ok: false, raison: refus }', vers: '' },
]

const copierDossier = (de, vers) => {
  fs.mkdirSync(vers, { recursive: true })
  for (const e of fs.readdirSync(de, { withFileTypes: true })) {
    if (e.isDirectory()) copierDossier(path.join(de, e.name), path.join(vers, e.name))
    else fs.copyFileSync(path.join(de, e.name), path.join(vers, e.name))
  }
}

console.log('SMS-QA — adaptateur SMS à blanc (032-024)')
const reel = await jouer(SMS, true)
console.log(`\nSuite réelle : ${reel.verts} verts, ${reel.rouges.length} rouges`)

let mutantsVivants = []
if (!process.argv.includes('--sans-mutants')) {
  console.log('\n— Mutants (une copie de lib/sms/ par mutation ; il faut au moins un rouge)')
  fs.rmSync(MUTANTS, { recursive: true, force: true })
  let i = 0
  try {
    for (const m of MUTATIONS) {
      i++
      const dir = path.join(MUTANTS, `m${String(i).padStart(2, '0')}`)
      copierDossier(SMS, dir)
      const fichier = path.join(dir, m.f)
      const source = fs.readFileSync(fichier, 'utf8')
      if (!source.includes(m.de)) { console.log(`FAIL mutant « ${m.nom} » : motif introuvable dans ${m.f} (mutation non appliquée)`); mutantsVivants.push(`${m.nom} (non appliqué)`); continue }
      fs.writeFileSync(fichier, source.replace(m.de, () => m.vers))
      const r = await jouer(dir, false)
      const tue = r.rouges.length > 0
      console.log(`${tue ? 'PASS' : 'FAIL'} mutant « ${m.nom} » ${tue ? 'tué par : ' + r.rouges.slice(0, 3).join(' | ') : 'SURVIT'}`)
      if (!tue) mutantsVivants.push(m.nom)
    }
  } finally {
    fs.rmSync(MUTANTS, { recursive: true, force: true })
  }
  console.log(`\nMutants : ${MUTATIONS.length - mutantsVivants.length}/${MUTATIONS.length} tués`)
}

globalThis.fetch = fetchReel
const mauvais = reel.rouges.length + mutantsVivants.length + (appelsFetch > 0 ? 1 : 0)
console.log(`\nAppels réseau tentés pendant la suite : ${appelsFetch}`)
console.log(mauvais === 0 ? `\nSMS-QA : TOUT VERT (${reel.verts} assertions, ${MUTATIONS.length} mutants tués)` : `\nSMS-QA : ROUGE — ${[...reel.rouges, ...mutantsVivants].join(' ; ')}`)
process.exit(mauvais === 0 ? 0 : 1)
