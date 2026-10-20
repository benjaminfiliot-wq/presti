#!/usr/bin/env node
// scripts/rgpd-qa.mjs — juge des CORRECTIFS DE L'AUDIT RGPD DU 20/10 (réserves « oui avec réserves »). Hors ligne : aucune base, aucun
// réseau, aucun appel IA. Les vraies fonctions de purge et d'effacement sont JOUÉES contre une doublure en mémoire du client de base
// (`db` injectable), pas relues en texte seulement.
//
//  A. EFFACEMENT À LA DEMANDE (lib/crm/effacement.ts, lib/crm/effacementServeur.ts, app/api/donnees/route.ts) : quels chantiers
//     perdent photos, adresse, position, lien de suivi ; fichiers retirés AVANT les lignes ; toujours filtré sur artisan_id ;
//     un chantier à devis envoyé / signé / facturé garde tout ; une erreur de stockage laisse les lignes.
//  B. ESSAIS GRATUITS (lib/purgesRgpd.ts, purgerEssaisGratuits) : 24 mois après la fin, ou après le début si la fin manque ;
//     branché dans le passage quotidien ; durée écrite au registre.
//  C. CONVERSATIONS (purgerConversationsSansSuite) : seules les conversations liées à un devis SIGNÉ ou facturé survivent aux 36
//     mois ; le texte de durée dit la même chose.
//  D. PURGE DU COMPTE (lib/purgeComptes.ts) : chaque table du CRM qui porte artisan_id (migrations 0141 et suivantes) est vidée à
//     l'anonymisation — la liste est RECALCULÉE depuis les migrations, pas recopiée.
//  E. LIEN DE SUIVI (lib/crm/suivi.ts, app/suivi/[jeton]/route.ts) : expiration 90 jours après la fin réelle, 404 propre.
//  F. TEXTES LÉGAUX : la Base Adresse Nationale est déclarée et rendue partout où les sous-traitants le sont ; chaque traitement
//     qui porte une clé de durée commence par la durée appliquée ; version des CGU = date affichée ; registre et procédures présents.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/rgpd-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

process.env.PRESTI_SECRET_CRM = 'secret-de-test-rgpd-qa-'.padEnd(40, 'x')
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && w.name !== 'ExperimentalWarning') console.error(w) })
const rouges = []
let verts = 0
const T = (nom, cond, detail = '') => { if (cond) { verts++; console.log(`PASS ${nom}`) } else { rouges.push(nom); console.log(`FAIL ${nom}${detail ? ' — ' + String(detail).slice(0, 500) : ''}`) } }
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8').replace(/\r\n/g, '\n')
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const sansCommentaires = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '')

// ── La doublure du client de base : filtres en mémoire, un journal ordonné des opérations (base ET stockage).
function fauxClient(tables, { echecStockage = false, erreursTable = {} } = {}) {
  const journal = []
  const from = (nom) => {
    const op = { type: 'select', filtres: [], tri: null, limite: null, patch: null, comptage: false }
    const b = {
      select(_c, o) { if (o?.count) op.comptage = true; return b },
      lt(c, v) { op.filtres.push((r) => r[c] != null && r[c] < v); op.eq = op.eq ?? []; return b },
      gte(c, v) { op.filtres.push((r) => r[c] != null && r[c] >= v); return b },
      is(c, v) { op.filtres.push((r) => (v === null ? r[c] == null : r[c] === v)); return b },
      not(c, _o, v) { op.filtres.push((r) => (v === null ? r[c] != null : r[c] !== v)); return b },
      eq(c, v) { op.filtres.push((r) => r[c] === v); (op.eq = op.eq ?? []).push(c); return b },
      in(c, arr) { op.filtres.push((r) => arr.includes(r[c])); return b },
      order(c, o) { op.tri = [c, o?.ascending !== false]; return b },
      limit(n) { op.limite = n; return b },
      delete() { op.type = 'delete'; return b },
      update(p) { op.type = 'update'; op.patch = p; return b },
      then(res, rej) { return Promise.resolve(exec()).then(res, rej) },
    }
    const exec = () => {
      if (erreursTable[nom]) return { data: null, error: { message: erreursTable[nom] } }
      const lignes = tables[nom]
      if (!lignes) return { data: null, count: null, error: { message: `relation "public.${nom}" does not exist` } }
      let sel = lignes.filter((r) => op.filtres.every((f) => f(r)))
      if (op.tri) sel = [...sel].sort((x, y) => (x[op.tri[0]] < y[op.tri[0]] ? -1 : x[op.tri[0]] > y[op.tri[0]] ? 1 : 0) * (op.tri[1] ? 1 : -1))
      if (op.limite != null) sel = sel.slice(0, op.limite)
      journal.push({ nom, type: op.type, n: sel.length, eq: op.eq ?? [], patch: op.patch })
      if (op.type === 'delete') { for (const r of sel) lignes.splice(lignes.indexOf(r), 1); return { data: null, error: null } }
      if (op.type === 'update') { for (const r of sel) Object.assign(r, op.patch); return { data: null, error: null } }
      return { data: sel.map((r) => ({ ...r })), count: sel.length, error: null }
    }
    return b
  }
  const storage = { from: (bucket) => ({ remove: async (chemins) => { journal.push({ nom: `storage:${bucket}`, type: 'remove', chemins }); return echecStockage ? { data: null, error: { message: 'stockage en panne' } } : { data: [], error: null } } }) }
  return { from, storage, journal, tables }
}

const Ef = await imp('lib/crm/effacement.ts')
const Es = await imp('lib/crm/effacementServeur.ts')
const P = await imp('lib/purgesRgpd.ts')
const L = await imp('lib/legalArtisan.ts')
const S = await imp('lib/crm/suivi.ts')
const Cl = await imp('lib/crm/clients.ts')
const Em = await imp('lib/crm/empreinte.ts')

// ═══════════════════════ A. Effacement à la demande ═══════════════════════
{
  const A = '11111111-1111-4111-8111-111111111111'
  const idDe = (cle) => Em.empreinteClient(A, cle)
  const devis = [
    { id: 'D1', artisan_id: A, lead_id: 'Lr', statut: 'accepte', client_nom: 'Client Rho', client_email: 'rho@test.invalid' },
    { id: 'D2', artisan_id: A, lead_id: null, statut: 'brouillon', client_nom: 'Client Rho', client_email: 'rho@test.invalid' },
    { id: 'D3', artisan_id: A, lead_id: null, statut: 'envoye', client_nom: 'Client Rho', client_email: 'rho@test.invalid' },
    { id: 'D4', artisan_id: A, lead_id: null, statut: 'brouillon', client_nom: 'Client Rho', client_email: 'rho@test.invalid' },
  ]
  const leads = [{ id: 'Lr', artisan_id: A, nom_prospect: 'Client Rho', contact: 'rho@test.invalid' }]
  const chantiers = [
    { id: 'C1', artisan_id: A, devis_id: 'D1', client_nom: 'Client Rho' },   // devis signé : tout reste
    { id: 'C2', artisan_id: A, devis_id: 'D2', client_nom: 'Client Rho' },   // devis brouillon : tout part
    { id: 'C3', artisan_id: A, devis_id: null, client_nom: 'client rho' },   // dépannage au même nom : tout part
    { id: 'C4', artisan_id: A, devis_id: 'D3', client_nom: 'Client Rho' },   // devis ENVOYÉ : tout reste
    { id: 'C5', artisan_id: A, devis_id: null, client_nom: 'Client Tau' },   // un autre client : intact
    { id: 'C6', artisan_id: A, devis_id: 'D2', client_nom: null },           // lié au client par son devis brouillon, sans nom : part aussi
    { id: 'C7', artisan_id: A, devis_id: 'D4', client_nom: 'Client Rho' },   // devis brouillon MAIS facturé : tout reste
  ]
  const factures = [{ devis_id: 'D1' }, { devis_id: 'D4' }]
  const groupes = Cl.regrouperClients({ artisanId: A, devis, factures: [], leads, chantiers, idDe })
  const choix = Ef.choisirEffacementCrm({ groupes, leadId: 'Lr', nomDemande: 'Client Rho', chantiers, devis, factures })
  T('A1 chantiers dont photos, adresse, position et suivi partent : sans devis envoyé ni facture, nom ou non, du client', egal(choix.chantiersAEffacer, ['C2', 'C3', 'C6']), JSON.stringify(choix.chantiersAEffacer))
  T('A2 devis envoyé, devis signé, devis brouillon FACTURÉ, autre client : rien n’est touché', ['C1', 'C4', 'C5', 'C7'].every((id) => !choix.chantiersAEffacer.includes(id)))
  T('A3 le choix existant des noms est inchangé (chantiersSansNom)', egal(choix.chantiersSansNom, ['C2', 'C3']), JSON.stringify(choix.chantiersSansNom))
  const sansFactures = Ef.choisirEffacementCrm({ groupes, leadId: 'Lr', nomDemande: 'Client Rho', chantiers, devis })
  T('A4 sans la liste des factures, rien ne casse (paramètre facultatif) — mais C7, brouillon, est alors effaçable : l’appelant DOIT la passer', sansFactures.chantiersAEffacer.includes('C7') && /factures: d\.factures/.test(lire('app/api/donnees/route.ts')))

  // La vraie fonction d'effacement, contre la doublure.
  const U = A
  const base = () => fauxClient({
    chantier_pieces: [
      { artisan_id: U, chantier_id: 'C2', chemin: `${U}/C2/a.webp` }, { artisan_id: U, chantier_id: 'C2', chemin: `${U}/C2/b.pdf` },
      { artisan_id: U, chantier_id: 'C3', chemin: `${U}/C3/c.jpg` },
      { artisan_id: U, chantier_id: 'C1', chemin: `${U}/C1/d.webp` },                       // devis signé : doit rester
      { artisan_id: 'autre', chantier_id: 'C2', chemin: 'autre/C2/e.webp' },                 // un autre compte, même identifiant de chantier : doit rester
    ],
    chantier_suivi: [{ artisan_id: U, chantier_id: 'C2' }, { artisan_id: U, chantier_id: 'C1' }, { artisan_id: 'autre', chantier_id: 'C2' }],
    chantiers: [
      { id: 'C2', artisan_id: U, adresse: '3 rue A', code_postal: '17000', ville: 'La Rochelle', lat: 46.1, lng: -1.1, geocode_le: '2026-10-01T00:00:00Z' },
      { id: 'C3', artisan_id: U, adresse: '5 rue B', code_postal: '17000', ville: 'La Rochelle', lat: 46.2, lng: -1.2, geocode_le: '2026-10-01T00:00:00Z' },
      { id: 'C1', artisan_id: U, adresse: '9 rue C', code_postal: '17000', ville: 'La Rochelle', lat: 46.3, lng: -1.3, geocode_le: '2026-10-01T00:00:00Z' },
      { id: 'C2', artisan_id: 'autre', adresse: 'ailleurs', code_postal: '75000', ville: 'Paris', lat: 48, lng: 2, geocode_le: '2026-10-01T00:00:00Z' },
    ],
  })
  {
    const db = base()
    const r = await Es.effacerDossiersChantiers(U, ['C2', 'C3'], db)
    const ligne = (id, art = U) => db.tables.chantiers.find((c) => c.id === id && c.artisan_id === art)
    T('A5 l’effacement réussit (null) et retire les photos des chantiers choisis seulement', r === null && egal(db.tables.chantier_pieces.map((p) => p.chemin).sort(), [`${U}/C1/d.webp`, 'autre/C2/e.webp'].sort()), JSON.stringify([r, db.tables.chantier_pieces]))
    const retraits = db.journal.filter((j) => j.nom === 'storage:chantier-pieces').flatMap((j) => j.chemins).sort()
    T('A6 les FICHIERS du bucket privé sont retirés (ceux du compte, pas ceux d’un autre)', egal(retraits, [`${U}/C2/a.webp`, `${U}/C2/b.pdf`, `${U}/C3/c.jpg`].sort()), JSON.stringify(retraits))
    const iFichier = db.journal.findIndex((j) => j.nom === 'storage:chantier-pieces'), iLigne = db.journal.findIndex((j) => j.nom === 'chantier_pieces' && j.type === 'delete')
    T('A7 les fichiers partent AVANT les lignes', iFichier >= 0 && iLigne > iFichier, JSON.stringify(db.journal.map((j) => j.nom + ':' + j.type)))
    T('A8 le lien de suivi des chantiers choisis disparaît, pas celui du devis signé ni celui d’un autre compte', egal(db.tables.chantier_suivi.map((s) => `${s.artisan_id}/${s.chantier_id}`).sort(), [`${U}/C1`, 'autre/C2'].sort()))
    T('A9 adresse, code postal, ville et position effacés ; geocode_le POSÉ (pas NULL : la carte ne redemande pas la BAN)', ['C2', 'C3'].every((id) => { const c = ligne(id); return c.adresse === null && c.code_postal === null && c.ville === null && c.lat === null && c.lng === null && !!c.geocode_le && c.geocode_le > '2026-10-01T00:00:00Z' }))
    T('A10 le chantier au devis signé et celui d’un autre compte sont intacts', ligne('C1').adresse === '9 rue C' && ligne('C1').lat === 46.3 && ligne('C2', 'autre').adresse === 'ailleurs')
    T('A11 CHAQUE opération d’écriture est filtrée sur artisan_id', db.journal.filter((j) => j.type !== 'select').filter((j) => !j.nom.startsWith('storage:')).every((j) => j.eq.includes('artisan_id')), JSON.stringify(db.journal.filter((j) => j.type !== 'select' && !(j.eq ?? []).includes('artisan_id'))))
    const r2 = await Es.effacerDossiersChantiers(U, ['C2', 'C3'], db)
    T('A12 rejouable : une seconde passe ne trouve plus rien et ne casse rien', r2 === null)
  }
  {
    const db = fauxClient({ chantier_pieces: [{ artisan_id: U, chantier_id: 'C2', chemin: `${U}/C2/a.webp` }], chantier_suivi: [{ artisan_id: U, chantier_id: 'C2' }], chantiers: [{ id: 'C2', artisan_id: U, adresse: 'x' }] }, { echecStockage: true })
    const r = await Es.effacerDossiersChantiers(U, ['C2'], db)
    T('A13 un retrait de fichier qui échoue laisse la ligne ET le reste (reprise possible), et rend l’erreur', typeof r === 'string' && /fichiers/.test(r) && db.tables.chantier_pieces.length === 1 && db.tables.chantier_suivi.length === 1 && db.tables.chantiers[0].adresse === 'x', String(r))
  }
  {
    const db = fauxClient({ chantiers: [{ id: 'C2', artisan_id: U, adresse: 'x', code_postal: '1', ville: 'v' }] })   // ni pièces ni suivi : migrations en retard
    const r = await Es.effacerDossiersChantiers(U, ['C2'], db)
    T('A14 tables 0163 / 0167 absentes : l’adresse part quand même, sans erreur', r === null && db.tables.chantiers[0].adresse === null)
  }
  {
    const db = fauxClient({ chantiers: [{ id: 'C2', artisan_id: U, adresse: 'x' }] }, { erreursTable: {} })
    T('A15 aucun chantier à effacer : aucune requête', (await Es.effacerDossiersChantiers(U, [], db)) === null && db.journal.length === 0)
  }
  {
    const db = fauxClient({ chantier_pieces: [{ artisan_id: U, chantier_id: 'C2', chemin: `${U}/C2/a.webp` }, { artisan_id: U, chantier_id: 'C3', chemin: `${U}/C3/b.webp` }], chantier_suivi: [{ artisan_id: U, chantier_id: 'C2' }] })
    T('A16 le récapitulatif compte photos et liens (même filtre), 0 si la table manque',
      (await Es.compterDeChantiers('chantier_pieces', U, ['C2', 'C3'], db)) === 2 && (await Es.compterDeChantiers('chantier_suivi', U, ['C2', 'C3'], db)) === 1 && (await Es.compterDeChantiers('chantier_suivi', U, ['C2'], fauxClient({}))) === 0)
  }
  const route = sansCommentaires(lire('app/api/donnees/route.ts'))
  const iPost = route.indexOf('export async function POST')
  const iDossiers = route.indexOf('effacerDossiersChantiers(uid, crm.chantiersAEffacer)', iPost), iAnon = route.indexOf("from('leads').update(", iPost), iImpact = route.indexOf('const crm = await impactCrm(uid, lead)', iPost)
  T('A17 la route : calcul AVANT, dossiers effacés AVANT l’anonymisation de la demande, erreur → 500 sans anonymiser', iImpact > 0 && iDossiers > iImpact && iAnon > iDossiers && /if \(echecDossiers\) \{[\s\S]{0,400}?status: 500/.test(route))
  T('A18 le récapitulatif (GET) annonce photos, adresse/position et lien de suivi', /photo/.test(route) && /position sur la carte/.test(route) && /de suivi donné/.test(route))
  const serveur = sansCommentaires(lire('lib/crm/effacementServeur.ts'))
  T('A19 le module serveur ne lit ni n’écrit sans artisan_id', (serveur.match(/\.from\('chantier_pieces'\)[^\n]*/g) ?? []).every((l) => /artisan_id/.test(l)) && /from\('chantier_suivi'\)\.delete\(\)\.eq\('artisan_id', uid\)/.test(serveur) && /from\('chantiers'\)\.update\([^\n]*\.eq\('artisan_id', uid\)/.test(serveur))
}

// ═══════════════════════ B. Essais gratuits ═══════════════════════
{
  const maintenant = new Date('2026-10-20T12:00:00Z')
  const il = (mois, jours = 0) => { const d = new Date(maintenant); d.setUTCMonth(d.getUTCMonth() - mois); d.setUTCDate(d.getUTCDate() - jours); return d.toISOString() }
  const db = fauxClient({
    essais_gratuits: [
      { email_hash: 'vieux', fin: il(24, 1), debut: il(25) },            // fini depuis 24 mois et 1 jour : part
      { email_hash: 'limite', fin: il(24, -1), debut: il(25) },          // fini depuis 24 mois moins un jour : reste
      { email_hash: 'recent', fin: il(2), debut: il(2, 7) },             // reste
      { email_hash: 'sans-fin-vieux', fin: null, debut: il(30) },        // pas de fin, début ancien : part
      { email_hash: 'sans-fin-recent', fin: null, debut: il(3) },        // pas de fin, début récent : reste
    ],
  })
  const r = await P.purgerEssaisGratuits(maintenant, 500, db)
  T('B1 essais finis depuis plus de 24 mois : purgés ; le reste est intact', egal(db.tables.essais_gratuits.map((e) => e.email_hash).sort(), ['limite', 'recent', 'sans-fin-recent']) && r.n === 2 && !r.erreur, JSON.stringify([r, db.tables.essais_gratuits.map((e) => e.email_hash)]))
  T('B2 la durée appliquée est celle de DUREES_MOIS.essai_gratuit = 24', L.DUREES_MOIS.essai_gratuit === 24)
  const absent = await P.purgerEssaisGratuits(maintenant, 500, fauxClient({}))
  T('B3 table absente (0156 pas posée) : ce n’est pas une erreur de purge', !absent.erreur && absent.n === 0, JSON.stringify(absent))
  const plein = await P.purgerEssaisGratuits(maintenant, 2, fauxClient({ essais_gratuits: [1, 2, 3].map((i) => ({ email_hash: 'v' + i, fin: il(40), debut: il(41) })) }))
  T('B4 borné : un plafond atteint est signalé (`plein`) et rien de plus n’est lu', plein.plein === true && plein.n === 2, JSON.stringify(plein))
  const src = sansCommentaires(lire('lib/purgesRgpd.ts'))
  T('B5 le passage quotidien appelle la purge et expose `essais` dans le bilan', /bilan\.essais = noter\(await purgerEssaisGratuits\(maintenant, PLAFOND_LIGNES\)\)/.test(src) && /essais: 0/.test(src) && /essais: number/.test(src))
  const iEss = src.indexOf('bilan.essais = noter(')
  T('B6 la purge des essais n’est PAS derrière un drapeau (une table sans drapeau ne se purge pas autrement)', iEss > 0 && !/actif\(/.test(src.slice(iEss - 60, iEss)))
  const reg = lire('docs/registre-traitements.md')
  T('B7 le registre écrit la durée (24 mois après la fin de l’essai) et la purge', /Le registre des essais gratuits/.test(reg) && /24 mois après la fin de l'essai/.test(reg) && /purgerEssaisGratuits/.test(reg))
}

// ═══════════════════════ C. Conversations portant un devis ═══════════════════════
{
  const avant = '2023-10-20T00:00:00.000Z'
  const vieux = '2019-01-01T00:00:00.000Z'
  const lead = (id) => ({ id, created_at: vieux })
  const db = fauxClient({
    leads: ['Lmort', 'Lbrouillon', 'Lenvoye', 'Lrefuse', 'Lsigne', 'Lsigne2', 'Lfacture', 'Lrecent'].map(lead),
    messages: [{ lead_id: 'Lrecent', sent_at: '2026-09-01T00:00:00Z' }, { lead_id: 'Lmort', sent_at: vieux }],
    devis: [
      { id: 'd1', lead_id: 'Lbrouillon', statut: 'brouillon', accepte_le: null },
      { id: 'd2', lead_id: 'Lenvoye', statut: 'envoye', accepte_le: null },
      { id: 'd3', lead_id: 'Lrefuse', statut: 'refuse', accepte_le: null },
      { id: 'd4', lead_id: 'Lsigne', statut: 'accepte', accepte_le: vieux },
      { id: 'd5', lead_id: 'Lsigne2', statut: 'envoye', accepte_le: vieux },     // signature datée, statut retombé : reste une pièce signée
      { id: 'd6', lead_id: 'Lfacture', statut: 'expire', accepte_le: null },     // facturé malgré son statut
    ],
    factures: [{ devis_id: 'd6' }],
  })
  const r = await P.purgerConversationsSansSuite(avant, 100, db)
  const restes = db.tables.leads.map((l) => l.id).sort()
  T('C1 le fil mort, le fil au devis brouillon / envoyé / refusé sont purgés', ['Lmort', 'Lbrouillon', 'Lenvoye', 'Lrefuse'].every((id) => !restes.includes(id)), restes.join(','))
  T('C2 le fil au devis SIGNÉ (statut ou signature datée), le fil au devis FACTURÉ et le fil récent restent', egal(restes, ['Lfacture', 'Lrecent', 'Lsigne', 'Lsigne2']), restes.join(','))
  T('C3 le bilan compte les fils effacés (4) et n’a pas d’erreur', r.n === 4 && !r.erreur, JSON.stringify(r))
  const src = sansCommentaires(lire('lib/purgesRgpd.ts'))
  T('C4 le code lit statut ET signature ET factures — plus de « tout devis rattaché »', /select\('id, lead_id, statut, accepte_le'\)/.test(src) && /from\('factures'\)\.select\('devis_id'\)/.test(src))
  const conv = L.TRAITEMENTS.find((t) => t.cle === 'conversation')
  T('C5 le texte de durée (legalArtisan) dit « sauf devis signé ou facture » après les 3 ans', conv.duree.startsWith(L.libelleDuree(L.DUREES_MOIS.conversation)) && /devis signé ou à une facture/.test(conv.duree), conv.duree)
  const cgu = lire('app/cgu/page.tsx'), conf = lire('app/confidentialite/page.tsx')
  T('C6 CGU et confidentialité disent la même chose', /sauf si elle est liée à un devis signé ou à une facture/.test(cgu) && /sauf si elle est liée à un devis signé ou à une facture/.test(conf))
}

// ═══════════════════════ D. Purge du compte : les tables du CRM ═══════════════════════
{
  const src = sansCommentaires(lire('lib/purgeComptes.ts'))
  const m = src.match(/const TABLES_A_VIDER = \[([\s\S]*?)\n\]/)
  const liste = new Set([...(m?.[1] ?? '').matchAll(/'([a-z_]+)'/g)].map((x) => x[1]))
  T('D1 TABLES_A_VIDER contient les refus d’après-chantier et les réglages du CRM', liste.has('crm_apres_opposition') && liste.has('crm_reglages'), [...liste].join(','))
  T('D2 …et déjà les liens de suivi, les réglages d’après-chantier, l’agenda, les photos, les rappels', ['chantier_suivi', 'crm_apres_chantier', 'crm_agenda', 'chantier_pieces', 'crm_rappels'].every((t) => liste.has(t)))
  // Les tables qui portent artisan_id dans les migrations 0141+ : toutes doivent y être, sauf exception motivée.
  const EXCEPTIONS = {
    essais_gratuits: 'survit volontairement au compte (c’est son but) ; purgée par purgerEssaisGratuits',
  }
  const dir = path.join(RACINE, 'supabase/migrations')
  const manquantes = []
  const vues = new Set()
  for (const f of fs.readdirSync(dir).filter((x) => /^0(14[1-9]|1[5-9]\d|[2-9]\d\d)_/.test(x) && !x.includes('_A_COLLER')).sort()) {
    const sql = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\r\n/g, '\n')
    for (const t of sql.matchAll(/create table if not exists public\.([a-z_]+)\s*\(([\s\S]*?)\n\);/g)) {
      if (!/\bartisan_id\b/.test(t[2])) continue
      vues.add(t[1])
      if (!liste.has(t[1]) && !(t[1] in EXCEPTIONS)) manquantes.push(`${t[1]} (${f})`)
    }
  }
  T('D3 chaque table à artisan_id créée par une migration 0141+ est vidée à l’anonymisation (liste recalculée depuis les migrations)', manquantes.length === 0 && vues.size >= 10, `${vues.size} tables vues ; manquantes : ${manquantes.join(', ')}`)
  T('D4 le détecteur voit bien les tables de cette série (0165, 0167, 0171, 0172)', ['crm_apres_chantier', 'chantier_suivi', 'crm_apres_opposition', 'crm_reglages'].every((t) => vues.has(t)), [...vues].join(','))
}

// ═══════════════════════ E. Expiration du lien de suivi ═══════════════════════
{
  const fin = '2026-07-01'
  T('E1 JOURS_SUIVI_APRES_FIN = 90', L.JOURS_SUIVI_APRES_FIN === 90)
  T('E2 le 89e jour après la fin : le lien répond encore', S.suiviExpire(fin, new Date('2026-09-28T23:59:59Z')) === false)
  T('E3 le 90e jour (minuit UTC) : le lien est expiré', S.suiviExpire(fin, new Date('2026-09-29T00:00:00Z')) === true)
  T('E4 bien après : expiré', S.suiviExpire(fin, new Date('2027-01-01T00:00:00Z')) === true)
  T('E5 chantier sans fin réelle (ouvert, ou rouvert) : jamais expiré', S.suiviExpire(null, new Date('2030-01-01')) === false && S.suiviExpire(undefined) === false && S.suiviExpire('') === false)
  T('E6 une date illisible n’expire pas (et ne jette pas)', S.suiviExpire('pas une date', new Date('2030-01-01')) === false)
  T('E7 une fin réelle horodatée (ISO complète) se lit sur son jour', S.suiviExpire('2026-07-01T10:00:00Z', new Date('2026-09-29T00:00:00Z')) === true)
  const route = sansCommentaires(lire('app/suivi/[jeton]/route.ts'))
  const iExp = route.indexOf('suiviExpire(ch.data.date_fin_reelle'), iTrace = route.indexOf("update({ dernier_acces_le"), iAnnule = route.indexOf("statut === 'annule'")
  T('E8 la route calcule l’expiration à la lecture, après la lecture du chantier, AVANT la trace du dernier accès, avec le même 404 qu’un jeton inconnu',
    iAnnule > 0 && iExp > iAnnule && iTrace > iExp && /if \(suiviExpire\(ch\.data\.date_fin_reelle as string \| null\)\) return introuvable\(\)/.test(route) && /date_fin_reelle, maj_le/.test(route))
  T('E9 aucune migration pour cela (pas de colonne d’expiration)', !fs.readdirSync(path.join(RACINE, 'supabase/migrations')).some((f) => /suivi.*expir|expir.*suivi/i.test(f)) && !/\bexpire?_le\b|\bexpiration\b/.test(lire('supabase/migrations/0167_chantier_suivi.sql')))
}

// ═══════════════════════ F. Textes légaux, registre, procédures ═══════════════════════
{
  const BAN = L.DESTINATAIRES_PUBLICS.find((d) => /api-adresse\.data\.gouv\.fr/.test(d.nom))
  T('F1 la Base Adresse Nationale est déclarée comme destinataire PUBLIC (service de l’État), adresse seule — jamais le nom du client', !!BAN && /adresse, le code postal et la ville/.test(BAN.role) && /jamais le nom du client/.test(BAN.role) && /État/.test(BAN.lieu), JSON.stringify(BAN))
  T('F2 …et n’est pas rangée parmi les sous-traitants « encadrés par un contrat »', !L.SOUS_TRAITANTS.some((s) => /Adresse Nationale|api-adresse/.test(s.nom)))
  const cgu = lire('app/cgu/page.tsx'), conf = lire('app/confidentialite/page.tsx'), infos = lire('app/site/[slug]/infos-legales/page.tsx')
  T('F3 la liste est RENDUE : annexe des CGU, politique de confidentialité, page « Informations légales » de chaque artisan', [cgu, conf, infos].every((p) => /DESTINATAIRES_PUBLICS\.map/.test(p)))
  const sujets = ['chantier', 'photos', 'suivi', 'après les travaux', 'agenda', 'assistant']
  const textes = L.TRAITEMENTS.map((t) => `${t.finalite} ${t.donnees}`.toLowerCase())
  const manque = sujets.filter((s) => !textes.some((t) => t.includes(s)))
  T('F4 TRAITEMENTS couvre : chantiers/CRM, photos de chantier, lien de suivi, après-chantier, agenda, assistant', manque.length === 0, manque.join(', '))
  const mauvais = L.TRAITEMENTS.filter((t) => t.cle && !t.duree.startsWith(L.libelleDuree(L.DUREES_MOIS[t.cle])))
  T('F5 chaque traitement qui porte une clé de durée COMMENCE par la durée appliquée (invariant de purges-rgpd-e2e)', mauvais.length === 0 && L.TRAITEMENTS.every((t) => t.cle === null || t.cle in L.DUREES_MOIS), mauvais.map((t) => t.finalite).join(' | '))
  const photos = L.TRAITEMENTS.find((t) => /photos et pièces/.test(t.finalite)), suivi = L.TRAITEMENTS.find((t) => /suivre l’avancement/.test(t.finalite))
  T('F6 durées dites : photos 3 ans après la fin ; lien de suivi 90 jours après la fin réelle', /3 ans après la fin du chantier/.test(photos?.duree ?? '') && /90 jours après la fin réelle/.test(suivi?.duree ?? ''), `${photos?.duree} / ${suivi?.duree}`)
  const apres = L.TRAITEMENTS.find((t) => /avis/.test(t.finalite))
  T('F7 l’après-chantier dit l’opposition (art. 21) et que le refus est gardé sans l’adresse', /opposer à tout moment/.test(apres?.base ?? '') && /jamais l’adresse elle-même/.test(apres?.donnees ?? ''))
  const ia = L.SOUS_TRAITANTS.find((s) => s.nom === 'Anthropic')
  T('F8 Anthropic : le rôle dit que le message du prospect lui est transmis, et l’assistant de gestion', /message du prospect/.test(ia?.role ?? '') && /assistant de gestion/.test(ia?.role ?? ''))
  // Version des CGU = date affichée.
  const mois = { janvier: '01', février: '02', mars: '03', avril: '04', mai: '05', juin: '06', juillet: '07', août: '08', septembre: '09', octobre: '10', novembre: '11', décembre: '12' }
  const dm = cgu.match(/Dernière mise à jour : (\d+)(?:er)? (\p{L}+) (\d{4})/u)
  const iso = dm ? `${dm[3]}-${mois[dm[2]]}-${String(dm[1]).padStart(2, '0')}` : null
  const ver = lire('app/signup/page.tsx').match(/const CGU_VERSION = '([^']+)'/)?.[1]
  T('F9 CGU_VERSION (inscription) = date « Dernière mise à jour » des CGU = 2026-10-20', !!iso && iso === ver && ver === '2026-10-20', `${iso} / ${ver}`)
  T('F10 la politique de confidentialité porte la même date, et cite les durées via DUREES_MOIS (pas en dur)', /20 octobre 2026/.test(conf) && /libelleDuree\(DUREES_MOIS\.crm\)/.test(conf) && /JOURS_SUIVI_APRES_FIN/.test(conf) && /libelleDuree\(DUREES_MOIS\.essai_gratuit\)/.test(conf))
  // Registre des traitements.
  const reg = lire('docs/registre-traitements.md')
  const attendus = [['CRM', /## 15\. Le CRM/], ['photos 0163', /## 16\. Photos[\s\S]*0163/], ['suivi 0167', /## 17\. Le lien de suivi[\s\S]*0167/], ['agenda 0164', /## 18\. Le lien d'agenda[\s\S]*0164/], ['après-chantier 0165/0171', /## 19\.[\s\S]*0165, 0171/], ['assistant 0150', /## 20\. L'assistant[\s\S]*0150/], ['essais 0156', /## 21\. Le registre des essais gratuits[\s\S]*0156/], ['relève de messagerie', /## 22\. La relève de messagerie/], ['traitement central Anthropic', /## 23\.[\s\S]*Anthropic pour rédiger/]]
  const absents = attendus.filter(([, re]) => !re.test(reg)).map(([n]) => n)
  T('F11 le registre contient toutes les entrées demandées', absents.length === 0, absents.join(', '))
  const iT = reg.indexOf('## 24. Transferts'); const tab = reg.slice(iT)
  const lignes = ['Supabase', 'Vercel', 'Anthropic', 'Resend', 'Stripe'].map((n) => [n, tab.split('\n').find((l) => l.startsWith(`| **${n}**`)) ?? ''])
  T('F12 le tableau des transferts nomme Vercel, Resend, Anthropic, Stripe, Supabase, avec lieu, garantie et pièce « à archiver »', lignes.every(([, l]) => l && /à archiver/i.test(l)), lignes.filter(([, l]) => !l).map(([n]) => n).join(','))
  const sansNegation = tab.replace(/« à archiver » ≠ « signé »/g, '').replace(/jamais comme \*signée\*/g, '')
  T('F13 il n’affirme la signature d’AUCUN accord (« signé » ne figure que pour dire qu’on ne l’affirme pas)', !/\bsign(é|ée|és|ées)\b/i.test(sansNegation), (sansNegation.match(/.{30}\bsign(é|ée|és|ées)\b.{30}/i) ?? [''])[0])
  // Procédure de violation et annonce.
  const v = lire('docs/violation-donnees.md')
  const exig = [['72 heures', /72 h/], ['art. 33', /art\. 33|Notifier la CNIL \(art\. 33\)/], ['art. 34', /art\. 34/], ['sans retard injustifié (CGU)', /sans retard injustifié/], ['registre art. 33.5', /33\.5/], ['tableau du registre vide', /\| N° \|[^\n]*\n\|[-| ]+\|\n\| (\| )+\|?\s*$/m], ['contacts', /## 7\. Contacts/], ['gabarit de message aux artisans', /Gabarit du message aux artisans/]]
  const vm = exig.filter(([, re]) => !re.test(v)).map(([n]) => n)
  T('F14 la procédure de violation : 72 h, art. 33 et 34, information des artisans, registre vide, contacts, gabarit', vm.length === 0, vm.join(', '))
  T('F15 la CGU promet « sans retard injustifié » (l.211) et renvoie à la procédure', /sans retard injustifié/.test(cgu) && /registre interne des violations/.test(cgu))
  const ann = lire('docs/annonce-maj-cgu-2026-10-20.md')
  T('F16 l’annonce aux artisans est un BROUILLON NON ENVOYÉ, et ne cite que des durées du code', /NON ENVOYÉ/.test(ann) && /90 jours/.test(ann) && /24 mois/.test(ann) && /3 ans/.test(ann))
  T('F17 aucun envoi n’a été câblé : rien dans app/ ni lib/ ne référence l’annonce', !fs.existsSync(path.join(RACINE, 'app/api/annonce-cgu')) && !/annonce-maj-cgu/.test(lire('lib/email.ts')))
}

console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)${rouges.length ? ' : ' + rouges.join(' · ') : ''}`)
process.exitCode = rouges.length ? 1 : 0
