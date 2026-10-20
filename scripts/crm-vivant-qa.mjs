#!/usr/bin/env node
// scripts/crm-vivant-qa.mjs — juge de « l'ATELIER VIVANT » du CRM (drapeau crmAtelierVivant, 20/10/2026) : l'accueil vivant (salle
// d'attente en trois files, arrivée en direct d'une demande) et le poste des assistants. Aucune migration, aucun réseau, aucune base,
// aucun envoi : tout se joue sur les fonctions pures et sur le texte des sources. Il passe drapeau BAISSÉ comme drapeau LEVÉ (les
// assertions qui dépendent de l'état du drapeau le disent).
//
//  A. SALLE D'ATTENTE (lib/crm/accueil.ts) : trois files, une action par ligne vers un écran qui existe, cas vides, plafond de lignes.
//  B. ARRIVÉE EN DIRECT : détection pure (le premier chargement ne déclenche RIEN), texte de la bannière, chute du colis < 700 ms.
//  C. POSTE DES ASSISTANTS (lib/crm/assistants.ts) : quatre compteurs, trois éléments au plus, le jour compte, cas vides, factures échues.
//  D. SCÈNE ET GARDE DU DRAPEAU : objet « assistants » seulement si demandé, dans le dépôt près du bureau sans rien chevaucher, colis ;
//     drapeau baissé = scène, Vue et exemple d'avant ; drapeau levé = l'exemple montre les deux ajouts.
//  E. SOURCES : reduced-motion respecté, zone aria-live, fermeture seule à 8 s, aucun envoi ajouté, tout est derrière le drapeau.
//  F. LANCEUR : la suite est au tableau SUITES de scripts/tout-verifier.mjs.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-vivant-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && w.name !== 'ExperimentalWarning') console.error(w) })
const rouges = []
let verts = 0
const T = (nom, cond, detail = '') => { if (cond) { verts++; console.log(`PASS ${nom}`) } else { rouges.push(nom); console.log(`FAIL ${nom}${detail ? ' — ' + String(detail).slice(0, 500) : ''}`) } }
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8').replace(/\r\n/g, '\n')
const existe = (rel) => fs.existsSync(path.join(RACINE, rel))
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const sansCommentaires = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '')

const { FLAGS } = await imp('lib/flags.ts')
const LEVE = FLAGS.crmAtelierVivant === true
console.log(`Drapeau crmAtelierVivant : ${LEVE ? 'LEVÉ' : 'baissé'}`)
const Acc = await imp('lib/crm/accueil.ts')
const Pos = await imp('lib/crm/assistants.ts')
const At = await imp('lib/crm/atelier.ts')
const { VUE_EXEMPLE, DONNEES_EXEMPLE, JOUR_EXEMPLE } = await imp('lib/crm/exemple.ts')
const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

// Une Vue minimale écrite à la main (colonnes du pipeline, rappels) : aucun jeu de données réel.
const frise = (devisLib, p = {}) => ({ pastilles: [
  { etape: 'demande', libelle: 'Demande', etat: 'fait', date: null, detail: '', piece: null },
  { etape: 'devis', libelle: 'Devis envoyé', etat: 'fait', date: p.envoye ?? null, detail: '', piece: devisLib ? { libelle: devisLib, href: '/x' } : null },
  { etape: 'signe', libelle: 'Signé', etat: 'fait', date: p.signe ?? null, detail: '', piece: devisLib ? { libelle: devisLib, href: '/x' } : null },
  { etape: 'facture', libelle: 'Facturé', etat: p.facture ?? 'a_venir', date: null, detail: p.factureDetail ?? 'Rien de facturé', piece: null },
], prochaine: null, manuel: null })
const carte = (o) => ({ cle: `${o.objet}:${o.id}`, objet: 'devis', id: 'x', titre: 'Chantier', client: 'Client', montant: null, etapeDerivee: 'demande', etape: 'demande', manuel: false, preuve: 'demande', devisId: null, leadId: null, chantierId: null, depuis: null, autresBrouillons: 0, frise: frise(null), aEncaisser: 0, ...o, cle: `${o.objet ?? 'devis'}:${o.id}` })
const colonnes = (par = {}) => ['demande', 'devis_envoye', 'signe', 'chantier', 'a_facturer', 'paye'].map((etape) => ({ etape, libelle: etape, cartes: par[etape] ?? [], montant: 0, aEncaisser: 0 }))
const vueMin = (par = {}, rappels = { liste: [], devisARelancer: [], aFaire: { enRetard: [], aujourdhui: [], semaine: [], total: 0 }, disponibles: true }, extra = {}) =>
  ({ maintenant: '2026-10-12T08:30:00.000Z', pipeline: { colonnes: colonnes(par), classes: 0, vide: false }, rappels, ...extra })

// ═══════════════════════ A. La salle d'attente ═══════════════════════
{
  const s = Acc.salleAttente(VUE_EXEMPLE)
  T('A1 trois files, dans l’ordre : Nouvelles demandes · Devis en attente du client · Signés, à planifier', egal(s.files.map((f) => [f.cle, f.titre]), [['nouvelles', 'Nouvelles demandes'], ['devis', 'Devis en attente du client'], ['signes', 'Signés, à planifier']]) && s.total === s.files.reduce((n, f) => n + f.total, 0))
  const colEx = (e) => VUE_EXEMPLE.pipeline.colonnes.find((c) => c.etape === e).cartes
  T('A2 les files sont celles des colonnes du pipeline (demande, devis_envoye, signe) : mêmes comptes, rien d’inventé', s.files[0].total === colEx('demande').length && s.files[1].total === colEx('devis_envoye').length && s.files[2].total === colEx('signe').length && s.files.every((f) => f.total >= 1), JSON.stringify(s.files.map((f) => f.total)))
  const dem = s.files[0].lignes
  T('A3 nouvelle demande : client, type de chantier, « reçue il y a … » ; une demande sans devis → « Répondre » qui ouvre LA conversation (/messages?lead=<id>, lot 4) ; un brouillon → son devis',
    dem.some((l) => l.client === 'Prospect fictif 2' && l.detail === 'Remplacement WC' && l.quand === 'reçue il y a 35 min' && l.action.href === `/messages?lead=${U(402)}` && l.action.libelle === 'Répondre')
    && dem.some((l) => l.cle.startsWith('devis:') && /devis en préparation/.test(l.detail) && l.action.href.startsWith('/devis/')), JSON.stringify(dem.slice(0, 2)))
  const dv = s.files[1].lignes
  const l514 = dv.find((l) => l.cle.endsWith('514')), l515 = dv.find((l) => l.cle.endsWith('515'))
  T('A4 devis en attente : numéro, montant TTC connu, « envoyé il y a N jours » (14 et 4), et la prochaine relance seulement si un rappel est posé',
    l514 && l515 && /EX-2026-014/.test(l514.detail) && /2 600 € TTC/.test(l514.detail.replace(/[\u202f\u00a0]/g, ' ')) && l514.quand === 'envoyé il y a 14 jours' && l514.relance === 'relance à faire' && /EX-2026-015/.test(l515.detail) && l515.quand === 'envoyé il y a 4 jours' && l515.relance === null, JSON.stringify([l514, l515]))
  T('A5 un devis à relancer propose « Relancer » (le tableau de bord, où le message se relit avant l’envoi) ; un autre « Voir le devis »', l514?.action.libelle === 'Relancer' && l514.action.href === '/crm?vue=tableau' && l515?.action.libelle === 'Voir le devis' && l515.action.href === `/devis/${U(515)}`)
  const sg = s.files[2].lignes[0]
  T('A6 signé à planifier : client, montant, « signé il y a 2 jours », action « Créer le chantier » vers l’onglet Chantiers', sg.client === 'Client fictif P' && /690 € TTC/.test(sg.detail) && sg.quand === 'signé il y a 2 jours' && sg.action.libelle === 'Créer le chantier' && sg.action.href === '/crm?vue=chantiers', JSON.stringify(sg))
  // — le montant inconnu n’est pas affiché ; la relance n’est annoncée que si elle existe ; un jour passé en paramètre fait foi —
  const sansMontant = Acc.salleAttente(vueMin({ devis_envoye: [carte({ objet: 'devis', id: 'D1', devisId: 'D1', client: 'Client D', titre: 'Poêle', montant: null, etape: 'devis_envoye', frise: frise('Devis N-1', { envoye: '2026-10-01' }) })] }))
  const lg = sansMontant.files[1].lignes[0]
  T('A7 montant inconnu : pas de « 0 € » ; sans rappel posé : pas de relance annoncée', lg.detail === 'Devis N-1 · Poêle' && lg.relance === null && lg.quand === 'envoyé il y a 11 jours', JSON.stringify(lg))
  const hier = Acc.salleAttente(vueMin({ devis_envoye: [carte({ objet: 'devis', id: 'D1', devisId: 'D1', etape: 'devis_envoye', frise: frise(null, { envoye: '2026-10-11' }) })] }), '2026-10-12').files[1].lignes[0]
  const plusTard = Acc.salleAttente(vueMin({ devis_envoye: [carte({ objet: 'devis', id: 'D1', devisId: 'D1', etape: 'devis_envoye', frise: frise(null, { envoye: '2026-10-11' }) })] }), '2026-10-20').files[1].lignes[0]
  T('A8 le jour passé en paramètre fait foi (« hier » le 12, « il y a 9 jours » le 20)', hier.quand === 'envoyé hier' && plusTard.quand === 'envoyé il y a 9 jours')
  // — cas vides —
  const vide = Acc.salleAttente(vueMin())
  T('A9 files vides : une phrase simple chacune, aucune ligne, total 0', vide.total === 0 && vide.files.every((f) => f.lignes.length === 0 && f.total === 0 && f.reste === 0 && f.vide.length > 10 && f.vide.endsWith('.')))
  const beaucoup = Acc.salleAttente(vueMin({ demande: Array.from({ length: 8 }, (_, i) => carte({ objet: 'lead', id: `L${i}`, leadId: `L${i}`, titre: 'Fuite', depuis: '2026-10-12T08:00:00.000Z' })) }))
  T('A10 plafond de lignes par file : 5 montrées, « + 3 autres », le total reste exact', beaucoup.files[0].lignes.length === Acc.LIGNES_PAR_FILE && beaucoup.files[0].reste === 3 && beaucoup.files[0].total === 8)
  T('A11 durées : à l’instant · min · h · hier · jours', egal([0, 10, 130, 60 * 30, 60 * 24 * 5].map((m) => Acc.ilYa(new Date(Date.parse('2026-10-12T08:30:00Z') - m * 60_000).toISOString(), '2026-10-12T08:30:00Z')), ['à l’instant', 'il y a 10 min', 'il y a 2 h', 'hier', 'il y a 5 jours']) && Acc.ilYa(null, 'x') === null && Acc.ilYa('pas une date', '2026-10-12T08:30:00Z') === null)
  // — chaque action mène à un écran qui existe —
  const ONGLETS = [...lire('app/crm/page.tsx').matchAll(/\{ id: '([a-z]+)', label:/g)].map((m) => m[1])
  const routeExiste = (href) => {
    const chemin = href.split('?')[0]
    if (chemin === '/messages') return existe('app/messages/page.tsx')
    if (chemin === '/factures') return existe('app/factures/page.tsx')
    if (/^\/devis\/[^/]+$/.test(chemin)) return existe('app/devis/[id]/page.tsx')
    if (/^\/crm\/chantiers\/[^/]+$/.test(chemin)) return existe('app/crm/chantiers/[id]/page.tsx')
    if (chemin === '/crm') return ONGLETS.includes(/vue=([a-z]+)/.exec(href)?.[1] ?? 'atelier')
    return false
  }
  const toutes = [...s.files.flatMap((f) => f.lignes.map((l) => l.action.href)), ...Pos.posteAssistants({ ...VUE_EXEMPLE, vivant: { facturesEmises: [{ factureId: 'F1', numero: 'F-1', client: 'C', montant: 100, echeance: '2026-10-01' }] } }, JOUR_EXEMPLE).assistants.flatMap((a) => [a.lien.href, ...a.elements.map((e) => e.href).filter(Boolean)])]
  const mortes = toutes.filter((h) => !routeExiste(h))
  T(`A12 toutes les actions (${toutes.length}, salle d’attente et assistants) mènent à une route ou à un onglet qui existe déjà`, mortes.length === 0 && toutes.length >= 8, JSON.stringify(mortes))
  T('A13 la salle d’attente ne lit rien d’autre que la Vue : aucune clé hors maintenant / pipeline / rappels', Acc.salleAttente({ maintenant: '2026-10-12T08:30:00.000Z', pipeline: { colonnes: colonnes() } }).total === 0)
}

// ═══════════════════════ B. L'arrivée en direct ═══════════════════════
{
  const a = (id, client = 'Client', type = 'Fuite') => ({ id, client, type })
  T('B1 le PREMIER chargement ne déclenche rien (avant absent : null, undefined)', egal(Acc.nouvellesArrivees(null, [a('1'), a('2')]), []) && egal(Acc.nouvellesArrivees(undefined, [a('1')]), []))
  T('B2 une relecture avec une demande de plus : exactement celle-là', egal(Acc.nouvellesArrivees([a('1'), a('2')], [a('3'), a('1'), a('2')]).map((x) => x.id), ['3']))
  T('B3 plusieurs arrivées ensemble : toutes, dans l’ordre', egal(Acc.nouvellesArrivees([a('1')], [a('4'), a('1'), a('5')]).map((x) => x.id), ['4', '5']))
  T('B4 aucune arrivée si rien ne change, ou si une demande disparaît (traitée, classée)', egal(Acc.nouvellesArrivees([a('1'), a('2')], [a('1'), a('2')]), []) && egal(Acc.nouvellesArrivees([a('1'), a('2')], [a('2')]), []))
  T('B5 un compte vide qui reçoit sa première demande : c’est une arrivée (avant = liste vide, pas absent)', egal(Acc.nouvellesArrivees([], [a('1')]).map((x) => x.id), ['1']))
  T('B6 deux relectures de suite identiques ne répètent pas l’annonce', (() => { let connues = null; const lectures = [[a('1')], [a('1'), a('2')], [a('1'), a('2')]]; return lectures.map((l) => { const n = Acc.nouvellesArrivees(connues, l); connues = l; return n.length }).join(',') === '0,1,0' })())
  T('B7 arriveesDe lit les demandes de la maquette (id, client, type = titre)', egal(Acc.arriveesDe(DONNEES_EXEMPLE.demandes).slice(0, 1), [{ id: DONNEES_EXEMPLE.demandes[0].id, client: DONNEES_EXEMPLE.demandes[0].client, type: DONNEES_EXEMPLE.demandes[0].titre }]) && DONNEES_EXEMPLE.demandes.length > 0)
  T('B8 texte de la bannière : « Nouvelle demande : {client} — {type} » ; plusieurs : « (+N autres) » ; client inconnu : dit sans inventer',
    Acc.texteArrivee([a('1', 'Prospect fictif 1', 'Fuite sous évier')]) === 'Nouvelle demande : Prospect fictif 1 — Fuite sous évier' && Acc.texteArrivee([a('1', 'A', 'X'), a('2'), a('3')]) === 'Nouvelle demande : A — X (+2 autres)' && Acc.texteArrivee([a('1', null, 'X')]) === 'Nouvelle demande : client sans nom — X' && Acc.texteArrivee([]) === '')
  const h = Acc.hauteurChute
  const pas = Array.from({ length: 101 }, (_, i) => h(i / 100))
  T('B9 le colis tombe de 4 m, rebondit, se pose : 4 au départ, 0 à la fin, jamais négatif, rebond visible (> 0 après l’impact)', h(0) === 4 && h(1) === 0 && h(1.5) === 0 && pas.every((x) => x >= 0 && x <= 4) && Math.max(...pas.slice(61, 85)) > 0.3 && h(0.6) < 0.01)
  T('B10 la chute dure moins de 700 ms', Acc.DUREE_CHUTE_MS > 0 && Acc.DUREE_CHUTE_MS < 700)
}

// ═══════════════════════ C. Le poste des assistants ═══════════════════════
{
  const JOUR = '2026-10-12'
  const poste = Pos.posteAssistants({ ...VUE_EXEMPLE, vivant: { facturesEmises: [] } }, JOUR)
  const cles = poste.assistants.map((a) => a.cle)
  T('C1 quatre assistants, dans l’ordre : relanceur · encaissement · facturation · agenda', egal(cles, ['relanceur', 'encaissement', 'facturation', 'agenda']) && egal(poste.assistants.map((a) => a.nom), ['Relanceur de devis', 'Encaissement', 'Facturation', 'Agenda']))
  const par = Object.fromEntries(poste.assistants.map((a) => [a.cle, a]))
  T('C2 le badge total = la somme des quatre compteurs', poste.total === poste.assistants.reduce((n, a) => n + a.total, 0) && poste.assistants.every((a) => Number.isInteger(a.total) && a.total >= 0))
  T('C3 Relanceur = la liste « Devis à relancer » de la Vue (lib/crm/rappels.ts), pas un second calcul', par.relanceur.total === VUE_EXEMPLE.rappels.devisARelancer.length && par.relanceur.total >= 1 && par.relanceur.elements[0].cle === VUE_EXEMPLE.rappels.devisARelancer[0].devisId && /EX-2026-014/.test(par.relanceur.elements[0].libelle))
  T('C4 Agenda = « À faire aujourd’hui » (en retard + aujourd’hui), comptés sur le jour passé', par.agenda.total === VUE_EXEMPLE.rappels.aFaire.total && par.agenda.total >= 3, `${par.agenda.total} vs ${VUE_EXEMPLE.rappels.aFaire.total}`)
  T('C5 au plus trois éléments par assistant, « reste » dit le complément', poste.assistants.every((a) => a.elements.length <= Pos.ELEMENTS_PAR_ASSISTANT && a.elements.length + a.reste === a.total) && par.agenda.reste === par.agenda.total - 3)
  const fact = par.facturation.elements
  T('C6 Facturation = dossiers à l’étape « à facturer » SANS facture faite : le chauffe-eau terminé y est, la mise aux normes gaz (facturée, règlement attendu) n’y est pas', par.facturation.total === 1 && /Chauffe-eau/.test(fact[0].libelle) && /aucune facture/.test(fact[0].detail) && fact[0].href === `/crm/chantiers/${U(3)}`, JSON.stringify(fact))
  const sansFacture = (etat, detail) => vueMin({ a_facturer: [carte({ objet: 'chantier', id: 'C1', titre: 'Chantier X', client: 'Client X', etape: 'a_facturer', chantierId: 'C1', frise: frise(null, { facture: etat, factureDetail: detail }) })] })
  T('C7 facturation entamée : on dit où on en est ; tout facturé : l’assistant se tait', Pos.posteAssistants(sansFacture('en_cours', '1 000 € facturés sur 2 000 €'), JOUR).assistants[2].elements[0].detail === '1 000 € facturés sur 2 000 €' && Pos.posteAssistants(sansFacture('fait', 'Facturé'), JOUR).assistants[2].total === 0)
  // — Encaissement : factures émises, non payées, échues —
  const L = (id, statut, echeance, extra = {}) => ({ id, artisan_id: 'A', devis_id: null, numero: `F-${id}`, statut, total_ttc: 120, avoir_de: null, date_emission: '2026-09-01', date_echeance: echeance, client_nom: `Client ${id}`, ...extra })
  const emises = Pos.facturesEmises('A', [
    L('1', 'emise', '2026-10-01'), L('2', 'emise', '2026-10-25'), L('3', 'payee', '2026-09-20'), L('4', 'brouillon', '2026-09-20'), L('5', 'emise', null),
    L('6', 'emise', '2026-09-10'), L('7', 'avoir', '2026-09-10', { avoir_de: '6' }), L('8', 'emise', '2026-09-01', { artisan_id: 'B' }), L('9', 'annulee', '2026-09-01'),
  ])
  T('C8 factures émises retenues : « émise » avec échéance, ni payée, ni brouillon, ni annulée, ni avoir, ni visée par un avoir, ni d’un autre compte', egal(emises.map((f) => f.factureId), ['1', '2']), JSON.stringify(emises.map((f) => f.factureId)))
  const enc = (jour) => Pos.posteAssistants(vueMin({}, undefined, { vivant: { facturesEmises: emises } }), jour).assistants[1]
  T('C9 Encaissement : seules les factures dont l’échéance est PASSÉE comptent, le jour fait foi (le 12 : 1 ; le 30 : 2, la plus en retard d’abord)',
    enc('2026-10-12').total === 1 && /échue depuis 11 j/.test(enc('2026-10-12').elements[0].detail) && enc('2026-10-12').elements[0].href === '/factures' && enc('2026-10-30').total === 2 && enc('2026-10-30').elements[0].cle === '1' && enc('2026-10-01').total === 0)
  T('C10 sans le champ `vivant` (drapeau baissé), l’Encaissement est vide : rien n’est inventé', Pos.posteAssistants(vueMin(), '2026-10-12').assistants[1].total === 0)
  const vides = Pos.posteAssistants(vueMin(), JOUR)
  T('C11 cas vides : quatre assistants, total 0, une phrase simple chacun', vides.total === 0 && vides.assistants.length === 4 && vides.assistants.every((a) => a.elements.length === 0 && a.vide.endsWith('.')))
  T('C12 rappels pas encore installés (table absente) : l’Agenda le dit au lieu de « rien de prévu »', /s’installent/.test(Pos.posteAssistants(vueMin({}, { liste: [], devisARelancer: [], aFaire: { enRetard: [], aujourdhui: [], semaine: [], total: 0 }, disponibles: false }), JOUR).assistants[3].vide))
  T('C13 la règle du produit est dite en tête, mot pour mot', Pos.REGLE_ASSISTANTS === 'Ils préparent, vous validez : rien ne part sans votre clic.' && lire('app/crm/atelier/Vivant.tsx').includes('REGLE_ASSISTANTS'))
  T('C14 chaque assistant a un lien vers un écran existant (factures, tableau de bord, chantiers)', egal(poste.assistants.map((a) => a.lien.href), ['/crm?vue=tableau', '/factures', '/crm?vue=chantiers', '/crm?vue=tableau']))
}

// ═══════════════════════ D. Scène et garde du drapeau ═══════════════════════
{
  const sans = At.construireScene(DONNEES_EXEMPLE)
  T('D1 sans option (drapeau baissé) : aucun objet « assistants », aucune clé `colis`, la scène est celle d’avant', !sans.objets.some((o) => o.type === 'assistants') && !('colis' in sans) && sans.objets.length > 0)
  const avec = At.construireScene(DONNEES_EXEMPLE, undefined, { vivant: { assistants: 6 } })
  const poste = avec.objets.filter((o) => o.type === 'assistants')
  T('D2 avec l’option : UN objet « assistants », libellé et détail dits, badge = le nombre de choses à valider', poste.length === 1 && poste[0].libelle === 'Poste des assistants' && poste[0].detail === '6 choses à valider' && egal(poste[0].badges.map((b) => [b.type, b.libelle]), [['valider', '6 à valider']]))
  T('D3 rien à valider : « Rien à valider » et pas de badge ; une seule chose : singulier', At.construireScene(DONNEES_EXEMPLE, undefined, { vivant: { assistants: 0 } }).objets.find((o) => o.type === 'assistants').badges.length === 0 && At.construireScene(DONNEES_EXEMPLE, undefined, { vivant: { assistants: 1 } }).objets.find((o) => o.type === 'assistants').detail === '1 chose à valider')
  T('D4 tout ce qui existait est toujours là, à l’identique (mêmes clés, même détail) : seul « assistants » s’ajoute', egal(avec.objets.filter((o) => o.type !== 'assistants').map((o) => [o.cle, o.detail]).sort(), sans.objets.map((o) => [o.cle, o.detail]).sort()) && avec.objets.length === sans.objets.length + 1)
  // — géométrie : dans le dépôt, près du bureau, sans chevaucher —
  const recouvre = (a, b) => Math.abs(a.p[0] - b.p[0]) < (a.s[0] + b.s[0]) / 2 - 1e-6 && Math.abs(a.p[2] - b.p[2]) < (a.s[2] + b.s[2]) / 2 - 1e-6
  const problemes = []
  for (const pr of At.PREREGLAGES) {
    const sc = At.construireScene(DONNEES_EXEMPLE, pr, { vivant: { assistants: 3 } })
    const io = sc.objets.findIndex((o) => o.type === 'assistants')
    const mien = Object.values(sc.instances).flat().filter((x) => x.o === io)
    const bureau = Object.values(sc.instances).flat().filter((x) => x.o === sc.objets.findIndex((o) => o.type === 'bureau'))
    if (!mien.length) { problemes.push(`${pr}: aucune forme`); continue }
    for (const x of mien) if (x.p[0] - x.s[0] / 2 < At.DEPOT.x0 || x.p[0] + x.s[0] / 2 > At.DEPOT.x1 || x.p[2] - x.s[2] / 2 < At.DEPOT.z0 || x.p[2] + x.s[2] / 2 > At.DEPOT.z1) problemes.push(`${pr}: hors du dépôt`)
    const dBureau = Math.hypot(sc.objets[io].centre[0] - sc.objets.find((o) => o.type === 'bureau').centre[0], sc.objets[io].centre[2] - sc.objets.find((o) => o.type === 'bureau').centre[2])
    if (!(dBureau > 0 && dBureau < 5)) problemes.push(`${pr}: à ${dBureau.toFixed(1)} m du bureau`)
    for (const autre of Object.values(sc.instances).flat()) {
      if (autre.o === io || autre.s[1] <= 0.15) continue // la dalle, les lignes de zone et les routes sont des surfaces, pas des objets
      for (const x of mien) if (recouvre(x, autre)) problemes.push(`${pr}: chevauche une forme (objet ${autre.o}) en [${autre.p}]`)
    }
    if (bureau.length === 0) problemes.push(`${pr}: bureau introuvable`)
  }
  T('D5 le poste est dans le dépôt, à moins de 5 m du bureau, et ne chevauche AUCUNE forme (bureau, établi et accessoires des neuf métiers, rayonnages, murs, comptoir)', problemes.length === 0, problemes.slice(0, 4).join(' | '))
  const colis = avec.colis ?? []
  const iAccueil = avec.objets.findIndex((o) => o.type === 'accueil')
  T('D6 colis : un par demande de la maquette (16 au plus), chaque index pointe sur la boîte de colis de l’accueil', colis.length === Math.min(DONNEES_EXEMPLE.demandes.length, At.LIMITES.colis) && colis.length > 0 && colis.every((c, i) => c.id === DONNEES_EXEMPLE.demandes[i].id && avec.instances.box[c.index]?.o === iAccueil && egal(avec.instances.box[c.index].s, [0.6, 0.32, 0.45])))
  // — le drapeau —
  T(`D7 drapeau ${LEVE ? 'LEVÉ' : 'BAISSÉ'} : la Vue ${LEVE ? 'porte' : 'ne porte PAS'} le champ \`vivant\` (factures émises)`, ('vivant' in VUE_EXEMPLE) === LEVE && (!LEVE || Array.isArray(VUE_EXEMPLE.vivant.facturesEmises)))
  T(`D8 l’exemple, drapeau ${LEVE ? 'levé : montre l’Encaissement (une facture émise échue, fictive)' : 'baissé : inchangé (sa facture émise reste à échoir le 25)'}`,
    LEVE ? Pos.posteAssistants(VUE_EXEMPLE, JOUR_EXEMPLE).assistants[1].total === 1 : (Pos.posteAssistants(VUE_EXEMPLE, JOUR_EXEMPLE).assistants[1].total === 0 && /date_echeance: actif\('crmAtelierVivant'\) \? '2026-10-09' : '2026-10-25'/.test(lire('lib/crm/exemple.ts'))))
  const ex = Pos.posteAssistants(VUE_EXEMPLE, JOUR_EXEMPLE), sa = Acc.salleAttente(VUE_EXEMPLE)
  T('D9 l’exemple montre l’accueil vivant (3 files non vides) et un poste dont le relanceur, la facturation et l’agenda ont des éléments, sans rien écrire (modules purs)', sa.files.every((f) => f.total > 0) && ex.assistants[0].total > 0 && ex.assistants[2].total > 0 && ex.assistants[3].total > 0)
  T('D10 les autres chiffres de l’exemple n’ont pas bougé (pipeline : 6 cartes en Demande, 2 en Devis envoyé, 1 en Signé ; atelier : 5 demandes)', VUE_EXEMPLE.pipeline.colonnes[0].cartes.length === 6 && VUE_EXEMPLE.pipeline.colonnes[1].cartes.length === 2 && VUE_EXEMPLE.pipeline.colonnes[2].cartes.length === 1 && DONNEES_EXEMPLE.demandes.length === 5)
  const f = lire('lib/flags.ts')
  T('D11 le drapeau existe, booléen, commenté avec sa date (20/10/2026), ce qui disparaît baissé et comment il se lève', typeof FLAGS.crmAtelierVivant === 'boolean' && /20\/10\/2026 — CRM, « atelier vivant »/.test(f) && /Baissé : /.test(f.slice(f.indexOf('20/10/2026 — CRM, « atelier vivant »'))) && /Se lève après/.test(f.slice(f.indexOf('20/10/2026 — CRM, « atelier vivant »'))))
}

// ═══════════════════════ E. Les sources ═══════════════════════
{
  const atelier = lire('app/crm/atelier/Atelier.tsx'), at = sansCommentaires(atelier)
  const scene = sansCommentaires(lire('app/crm/atelier/Scene3D.tsx'))
  const css = lire('app/crm/atelier/atelier.css')
  const panneau = sansCommentaires(lire('app/crm/atelier/Panneau.tsx'))
  const plan = sansCommentaires(lire('app/crm/atelier/Plan2D.tsx'))
  // reduced-motion
  const iEffet = at.indexOf('useLayoutEffect(() => {'), effet = at.slice(iEffet, at.indexOf('}, [vivant, donnees.demandes, scene])'))
  T('E1 « réduire les animations » : l’arrivée affiche la bannière puis SORT avant de poser la chute ou le surlignage', effet.indexOf('setArrivee(nouvelles)') > 0 && effet.indexOf('if (calme()) return') > effet.indexOf('setArrivee(nouvelles)') && effet.indexOf('setChute(') > effet.indexOf('if (calme()) return') && effet.indexOf("setSurligne('accueil')") > effet.indexOf('if (calme()) return'), effet)
  T('E2 la 3D ignore aussi la chute si la préférence est « moins d’animations » (mouvementReduit dans le calcul des colis qui tombent)', /if \(!chute \|\| !chute\.index\.length \|\| mouvementReduit\(\)\) return null/.test(scene) && scene.includes('DUREE_CHUTE_MS') && scene.includes('hauteurChute('))
  const iSurl = css.indexOf('.atl-plan-objet.arrivee'), iMedia = css.lastIndexOf('@media', iSurl), dedans = css.slice(iMedia, iSurl)
  const horsMedia = css.replace(/@media \(prefers-reduced-motion: no-preference\) \{[\s\S]*?\n\}/g, '')
  T('E3 le surlignage 2D et la bannière n’animent que DANS un bloc @media (prefers-reduced-motion: no-preference) : hors de ce bloc, ni animation ni surlignage', iSurl > 0 && /^@media \(prefers-reduced-motion: no-preference\)/.test(dedans) && (dedans.match(/\{/g) ?? []).length - (dedans.match(/\}/g) ?? []).length > 0 && !/\.atl-plan-objet\.arrivee|\.atl-arrivee\s*\{[^}]*animation/.test(horsMedia))
  // aria-live
  T('E4 la bannière vit dans une zone role="status" aria-live="polite" qui existe avant elle ; bouton « Voir » et bouton de fermeture nommé', /<div className="atl-arrivee-zone" role="status" aria-live="polite"/.test(at) && at.indexOf('atl-arrivee-zone') < at.indexOf('className="atl-arrivee"') && at.includes('>Voir</button>') && at.includes('aria-label="Fermer l’annonce"'))
  T('E5 la bannière se ferme seule après 8 s (setTimeout 8000) et au clic ; le surlignage 2D après 5 s', /setTimeout\(\(\) => setArrivee\(null\), 8000\)/.test(at) && /setTimeout\(\(\) => setSurligne\(null\), 5000\)/.test(at) && at.includes('onClick={() => setArrivee(null)}'))
  T('E6 le premier chargement ne déclenche rien : `connues` démarre à null et nouvellesArrivees(null, …) ne rend rien', /useRef<Arrivee\[\] \| null>\(null\)/.test(at) && at.includes('nouvellesArrivees(connues.current, apres)'))
  // le drapeau garde tout
  T('E7 TOUT est derrière le drapeau : `vivant = actif(\'crmAtelierVivant\') && !!vue`, la scène n’reçoit l’option qu’alors, Panneau/Scene3D/Plan2D reçoivent `undefined`/`null` sinon',
    at.includes("const vivant = actif('crmAtelierVivant') && !!vue") && /construireScene\(donnees, prereglage, total !== null \? \{ vivant: \{ assistants: total \} \} : undefined\)/.test(at) && at.includes('vue={vivant ? vue : undefined}') && at.includes('chute={vivant ? chute : null}') && at.includes('surligne={vivant ? surligne : null}') && /\{vivant && \(\s*<div className="atl-arrivee-zone"/.test(at) && lire('app/crm/page.tsx').includes("const vivant = actif('crmAtelierVivant')") && lire('lib/crm/vue.ts').includes("actif('crmAtelierVivant') ? { vivant:"))
  const accueilAncien = panneau.slice(panneau.indexOf('function PanneauAccueil'))
  T('E8 panneau de l’accueil : sans Vue, c’est l’ancien (liste des demandes, « Répondre » vers /messages, « Créer le devis » vers /devis/nouveau?lead=, phrase des demandes absentes) — ancien code intact',
    panneau.includes('(vue ? <SalleAttentePanneau vue={vue} jour={donnees.jour} onVue2D={onVue2D} /> : <PanneauAccueil donnees={donnees} />)') && /Aucune nouvelle demande\. Elles arrivent ici depuis votre page de conversation et votre boîte e-mail\./.test(accueilAncien) && accueilAncien.includes('href="/messages">Répondre</Lien>') && accueilAncien.includes('href={`/devis/nouveau?lead=${dm.id}`}>Créer le devis</Lien>') && /\{objet\.type === 'assistants' && poste &&/.test(panneau))
  T('E9 le plan 2D : la zone Assistants n’existe que si l’objet existe ; l’accueil surligné par la classe `arrivee`', plan.includes("if ((z.type === 'assistants' || z.type === 'structure') && objets.length === 0) return null") && plan.includes("surligne === o.cle ? ' arrivee' : ''"))
  // aucun envoi
  const neufs = ['lib/crm/accueil.ts', 'lib/crm/assistants.ts', 'app/crm/atelier/Vivant.tsx'].map((r) => [r, sansCommentaires(lire(r))])
  const interdit = /sendEmail|nodemailer|resend|fetch\s*\(|\bappel\s*\(|XMLHttpRequest|sendBeacon|supabase|method:\s*['"](POST|PUT|PATCH|DELETE)['"]|\.insert\(|\.update\(|\.upsert\(|\.delete\(/i
  T('E10 AUCUN envoi, aucune écriture, aucun réseau dans les trois fichiers ajoutés (e-mail, fetch, appel(), supabase, POST/PATCH/DELETE)', neufs.every(([, s]) => !interdit.test(s)), neufs.filter(([, s]) => interdit.test(s)).map(([r, s]) => r + ':' + interdit.exec(s)[0]).join(', '))
  const diffAtelier = sansCommentaires(lire('app/crm/atelier/Atelier.tsx') + lire('app/crm/atelier/Scene3D.tsx') + lire('app/crm/atelier/Panneau.tsx'))
  T('E11 les composants de l’atelier n’ont gagné ni appel réseau ni e-mail : seuls les appels déjà là (appel() des tâches et commandes du panneau) y sont', !/sendEmail|resend|nodemailer/i.test(diffAtelier) && !/fetch\s*\(/.test(diffAtelier) && (diffAtelier.match(/\bappel\s*[(<]/g) ?? []).length <= 4, String((diffAtelier.match(/\bappel\s*[(<]/g) ?? []).length))
  T('E12 le poste affiche la règle « Ils préparent, vous validez » et chaque assistant un lien (bouton d’onglet ou <Lien>), jamais un bouton qui envoie', neufs[2][1].includes('REGLE_ASSISTANTS') && neufs[2][1].includes('<Aller action={a.lien}') && !/onClick=\{\(\) => void/.test(neufs[2][1]))
  T('E13 white-label et sobriété : aucun « Presti » dans les textes ajoutés', neufs.every(([, s]) => !/presti/i.test(s.replace(/\/\/.*$/gm, ''))))
}

// ═══════════════════════ J. Lot 4 : le CRM est branché sur tout ce qui existait AVANT lui, et aucune action n'est morte ═══════════════════════
{
  const { construireVue } = await imp('lib/crm/vue.ts')
  // « Avant le CRM » : un compte qui a reçu une demande sur sa page (/p), envoyé un devis, fait signer un autre (sans chantier), facturé un
  // troisième — et rien créé dans le CRM. Données FICTIVES écrites ici.
  const A = U(1), T0 = '2026-10-12T08:30:00.000Z'
  const devis = (n, statut, envoye, accepte, extra = {}) => ({ id: U(n), artisan_id: A, lead_id: null, statut, numero: `D-${n}`, objet: `Travaux ${n}`, client_nom: `Client fictif ${n}`, client_email: `client-${n}@exemple.invalid`, client_adresse: null, total_ttc: 1200, total_ht: 1000, acompte_pct: 0, date_emission: '2026-10-01', envoye_le: envoye, accepte_le: accepte, created_at: '2026-10-01T09:00:00.000Z', validite_jours: 30, ...extra })
  const d = {
    leads: [{ id: U(10), artisan_id: A, statut: 'nouveau', nom_prospect: 'Prospect fictif page', contact: 'p@exemple.invalid', canal: 'page', type_chantier: 'Fuite', ville: 'Ville fictive', created_at: '2026-10-12T07:00:00.000Z' }],
    devis: [devis(20, 'envoye', '2026-10-05T09:00:00.000Z', null), devis(21, 'accepte', '2026-10-02T09:00:00.000Z', '2026-10-06T09:00:00.000Z'), devis(22, 'accepte', '2026-09-20T09:00:00.000Z', '2026-09-25T09:00:00.000Z')],
    factures: [{ id: U(30), artisan_id: A, devis_id: U(22), numero: 'F-30', statut: 'emise', total_ttc: 1200, avoir_de: null, date_emission: '2026-10-01', date_echeance: '2026-10-31', client_nom: 'Client fictif 22', client_email: 'client-22@exemple.invalid', client_id: null, acompte_pct: 0 }],
    chantiers: [], taches: [], materiaux: [], deplacements: [], carnet: [], vehicules: [], membres: [], equipe: [], tronque: false, commandes: [], commandesDisponibles: true, rappels: [], rappelsDisponibles: true,
  }
  const v = construireVue({ uid: A, metier: 'Plombier', formeJuridique: 'EI', entreprise: { nom: 'Entreprise fictive', ville: 'Ville fictive' }, d, maintenant: new Date(T0), idDe: (c) => c })
  const col = (e) => v.pipeline.colonnes.find((c) => c.etape === e).cartes
  T('J1 ce qui existait AVANT le CRM est dans le pipeline sans rien ressaisir : la demande de la page (Demande), le devis envoyé (Devis envoyé), le devis signé sans chantier (Signé), le devis facturé (À facturer)',
    col('demande').some((c) => c.leadId === U(10) || c.id === U(10)) && col('devis_envoye').some((c) => c.devisId === U(20)) && col('signe').some((c) => c.devisId === U(21)) && col('a_facturer').some((c) => c.devisId === U(22)), JSON.stringify(v.pipeline.colonnes.map((c) => [c.etape, c.cartes.length])))
  const s = Acc.salleAttente(v, '2026-10-12')
  T('J2 … et dans la salle d’attente : la demande (Répondre → /messages?lead=<id>), le devis envoyé, le devis signé dans « Signés, à planifier » (Créer le chantier)',
    s.files[0].lignes.some((l) => l.action.href === `/messages?lead=${U(10)}`) && s.files[1].lignes.some((l) => l.cle.endsWith(U(20))) && s.files[2].lignes.some((l) => l.cle.endsWith(U(21)) && l.action.libelle === 'Créer le chantier'), JSON.stringify(s.files.map((f) => f.lignes.map((l) => [l.cle, l.action]))))
  T('J3 … et dans l’atelier : la demande est un colis de l’accueil, le profil (métier, forme juridique, nom, ville) est repris de la fiche', v.atelier.demandes.some((x) => x.id === U(10)) && v.atelier.metier === 'Plombier' && v.atelier.formeJuridique === 'EI' && v.atelier.entreprise?.nom === 'Entreprise fictive' && v.devisSignesSansChantier.some((x) => x.id === U(21)))
  // Tout est lu pour le compte connecté seulement : chaque lecture de chargerDossiers est filtrée par artisan_id = uid.
  const srv = sansCommentaires(lire('lib/crm/serveur.ts'))
  const corps = srv.slice(srv.indexOf('export async function chargerDossiers'), srv.indexOf('\n}\n', srv.indexOf('export async function chargerDossiers')))
  const lectures = [...corps.matchAll(/supabaseAdmin\.from\('([a-z_]+)'\)\.select\([^)]*\)([^\n]*)/g)]
  T('J4 chaque table lue par le CRM (devis, factures, demandes, chantiers, tâches, stock, équipe, véhicules, commandes, rappels…) est filtrée par .eq(\'artisan_id\', uid) : aucune donnée d’un autre compte', lectures.length >= 14 && lectures.every((m) => m[2].includes(".eq('artisan_id', uid)")), lectures.filter((m) => !m[2].includes(".eq('artisan_id', uid)")).map((m) => m[1]).join(','))
  // Table de vérification « le CRM est connecté à tout » : source → où ça apparaît → preuve.
  const branchements = [
    ['devis', /from\('devis'\)/, 'pipeline, salle d’attente, chantiers (J1-J2)'], ['factures', /from\('factures'\)/, 'pipeline, poste Encaissement (J1, C*)'],
    ['demandes de la page /p', /from\('leads'\)/, 'pipeline, salle d’attente, colis de l’accueil (J1-J3)'], ['inventaire', /from\('materiaux'\)/, 'rayonnages, structures, panneau stock (crm-atelier3d-qa I15)'],
    ['équipe', /from\('equipe_membres'\)/, 'personnages, vestiaire'], ['véhicules', /from\('vehicules'\)/, 'camionnettes, garage'], ['rappels', /from\('crm_rappels'\)/, 'poste Agenda'], ['commandes', /from\('commandes_fournisseur'\)/, 'camion de livraison, quais'],
  ]
  T('J5 le CRM est branché sur chaque source (devis, factures, demandes, inventaire, équipe, véhicules, rappels, commandes) ; les messages s’ouvrent à la bonne conversation (?lead=) ; l’assistant lit le même inventaire (GET /api/inventaire)',
    branchements.every(([, re]) => re.test(corps)) && lire('app/plateforme/Conversations.tsx').includes(".get('lead')") && /app\/api\/inventaire\/route\.ts/.test(lire('lib/assistant/executeurs.ts')), branchements.filter(([, re]) => !re.test(corps)).map(([n]) => n).join(','))
  // Aucune action morte : sur un vrai compte un lien vers l'écran existant ; dans l'exemple (ou la démonstration) un dialogue.
  const viv = sansCommentaires(lire('app/crm/atelier/Vivant.tsx'))
  const toutes = [...Acc.salleAttente(VUE_EXEMPLE, JOUR_EXEMPLE).files.flatMap((f) => f.lignes.map((l) => l.action.href)), ...Pos.posteAssistants(VUE_EXEMPLE, JOUR_EXEMPLE).assistants.flatMap((a) => [a.lien.href, ...a.elements.map((e) => e.href).filter(Boolean)])]
  const couvert = (h) => /^\/crm\?vue=/.test(h) || /^\/crm\/(chantiers|clients)\//.test(h) || /^\/messages|^\/devis\/nouveau|^\/devis\/|^\/factures/.test(h)
  T('J6 AUCUNE action de la salle d’attente ni du poste n’est morte : onglet du CRM, fiche d’exemple, ou dialogue d’exemple (Répondre : message du client, réponse proposée, « Valider et envoyer » sans rien envoyer)',
    toutes.length > 5 && toutes.every(couvert) && /if \(!sansEcriture \|\| lienExemple\(action\.href\)\) return <Lien/.test(viv) && viv.includes('Valider et envoyer') && viv.includes('Ici, rien n’est parti.') && viv.includes('Exemple · données fictives') && /<Aller action=\{\{ libelle: e\.libelle, href: e\.href \}\}/.test(viv), toutes.filter((h) => !couvert(h)).join(','))
}

// ═══════════════════════ F. Le lanceur ═══════════════════════
{
  const lanceur = lire('scripts/tout-verifier.mjs')
  T('F1 la suite est au tableau SUITES de scripts/tout-verifier.mjs (cout: gratuit), à côté de « CRM lot 5 »', /nom: 'CRM atelier vivant[^']*', cmd: 'node', args: \['--experimental-strip-types', '--import', '\.\/scripts\/ts-loader\.mjs', 'scripts\/crm-vivant-qa\.mjs'\], cout: 'gratuit'/.test(lanceur) && lanceur.indexOf('CRM atelier vivant') > lanceur.indexOf('CRM lot 5'))
}

console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)${rouges.length ? ' : ' + rouges.join(' · ') : ''}`)
process.exitCode = rouges.length ? 1 : 0
