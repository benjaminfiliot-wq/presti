#!/usr/bin/env node
// scripts/crm-connecte-qa.mjs — juge de « LE CRM EST CONNECTÉ À TOUT, EN TEMPS RÉEL » (décision C du fondateur, 21/10/2026).
//
// Hors ligne : aucune base, aucun réseau, aucun appel IA, aucun envoi. La VRAIE lecture du CRM (lib/crm/serveur.ts, chargerDossiers,
// celle de GET /api/crm/vue) est JOUÉE contre une doublure en mémoire du client de base, sur des données « d'AVANT le CRM » : des
// demandes, des devis, des factures et un inventaire créés par les écrans historiques (Messages, Devis, Factures, Inventaire), sans
// aucun chantier. Chaque geste de ces écrans est rejoué comme leur route l'écrit (même table, mêmes colonnes), puis la vue est
// relue et on vérifie qu'il apparaît là où l'artisan l'attend.
//
//  A. DEVIS : créé (brouillon) → salle d'attente « devis en préparation » ; envoyé → pipeline « devis envoyé » et file « Devis en
//     attente du client » ; accepté → « Signés, à planifier » ET « chantier proposé » (devisSignesSansChantier).
//  B. FACTURE : émise et échue → poste des assistants (Encaissement), « À encaisser » des chiffres ; payée → sort de l'encaissement.
//  C. INVENTAIRE : un article créé hors CRM → stock de l'atelier ; une sortie (appliquer_mouvement) → le reste baisse.
//  D. FICHE ARTISAN : métier, forme juridique, nom, ville, adresse → l'atelier (lus par gardeCrm, passés par la route à la vue).
//  E. DEMANDE /p : une demande qui arrive → l'arrivée en direct (nouvellesArrivees) et la file « Nouvelles demandes ».
//  F. TEMPS RÉEL : la liste des tables LUES est recalculée depuis le code (requêtes réellement faites par chargerDossiers + gardeCrm +
//     lireReglages + jointures) ; chacune est écoutée (lib/crm/tempsReel.ts) ou écartée avec sa raison ; chaque table écoutée est dans
//     la publication supabase_realtime des migrations ; chaque table qu'un geste ci-dessus écrit est écoutée ; filtre artisan_id = uid.
//  G. ISOLATION : chaque requête de la lecture porte artisan_id = uid ; les lignes d'un AUTRE compte ne paraissent nulle part.
//  H. LANCEUR : la suite est au tableau SUITES de scripts/tout-verifier.mjs.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/crm-connecte-qa.mjs
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { register } from 'node:module'

process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:1'
process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'cle-de-test-sans-base'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= 'cle-anon-de-test'
const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && w.name !== 'ExperimentalWarning') console.error(w) })
const rouges = []
let verts = 0
const T = (nom, cond, detail = '') => { if (cond) { verts++; console.log(`PASS ${nom}`) } else { rouges.push(nom); console.log(`FAIL ${nom}${detail ? ' — ' + String(detail).slice(0, 500) : ''}`) } }
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8').replace(/\r\n/g, '\n')
const imp = (rel) => import(pathToFileURL(path.join(RACINE, rel)).href)
const sansCommentaires = (s) => s.replace(/^\s*\/\/.*$/gm, '').replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1').replace(/\/\*[\s\S]*?\*\//g, '')

// lib/crm/serveur.ts importe « next/server » sans extension : Node ESM ne le résout pas seul (même parade que coherence-flux-qa).
register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { if (/^next\\/[a-z-]+$/.test(s)) return n(s + '.js', c); return n(s, c) }`))
process.env.RESEND_API_KEY = '' // aucun e-mail réel, quoi qu'il arrive (rien ici n'en envoie)

const { FLAGS } = await imp('lib/flags.ts')
const Srv = await imp('lib/crm/serveur.ts')
const { construireVue } = await imp('lib/crm/vue.ts')
const Acc = await imp('lib/crm/accueil.ts')
const Pos = await imp('lib/crm/assistants.ts')
const Tr = await imp('lib/crm/tempsReel.ts')
const Infra = await imp('lib/crm/infrastructure.ts')
const VIVANT = FLAGS.crmAtelierVivant === true
console.log(`Drapeaux : crmAtelierVivant ${VIVANT ? 'LEVÉ' : 'baissé'} · crmTempsReelComplet ${FLAGS.crmTempsReelComplet ? 'LEVÉ' : 'baissé'}`)

const U = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const A = U(1), B = U(2) // A : le compte de la session ; B : un autre compte, qui ne doit jamais paraître
const MAINTENANT = new Date('2026-10-21T09:00:00.000Z')
const JOUR = '2026-10-21'
const ilYa = (j) => new Date(MAINTENANT.getTime() - j * 86_400_000).toISOString()

// ── La doublure du client de base : filtres en mémoire, et le relevé de CHAQUE requête (table, colonnes, filtres).
const requetes = []
function fauxClient(tables) {
  return {
    from(nom) {
      const op = { table: nom, select: '', filtres: [], eqs: {}, tri: [], de: 0, a: Infinity }
      requetes.push(op)
      const b = {
        select(c) { op.select = String(c ?? '*'); return b },
        eq(c, v) { op.filtres.push((r) => r[c] === v); op.eqs[c] = v; return b },
        in(c, arr) { op.filtres.push((r) => arr.includes(r[c])); return b },
        or(expr) {
          // Seule forme utilisée par la lecture : « col.is.null,col.gte.<valeur> ».
          const conds = String(expr).split(',').map((x) => { const [c, o, ...v] = x.split('.'); return { c, o, v: v.join('.') } })
          op.filtres.push((r) => conds.some(({ c, o, v }) => (o === 'is' && v === 'null' ? r[c] == null : o === 'gte' ? r[c] != null && r[c] >= v : false)))
          return b
        },
        order(c, o) { op.tri.push([c, o?.ascending !== false]); return b },
        range(de, a) { op.de = de; op.a = a; return b },
        then(res, rej) { return Promise.resolve(exec()).then(res, rej) },
      }
      const exec = () => {
        const lignes = tables[nom]
        if (!lignes) return { data: null, error: { code: '42P01', message: `relation "public.${nom}" does not exist` } }
        let sel = lignes.filter((r) => op.filtres.every((f) => f(r))).map((r) => ({ ...r }))
        // Les jointures de la lecture (materiaux → stock, fournisseurs), comme PostgREST les rend.
        if (nom === 'materiaux') sel = sel.map((m) => ({ ...m, stock: (tables.stock ?? []).filter((s) => s.materiau_id === m.id).map((s) => ({ lieu: s.lieu, quantite: s.quantite })), fournisseur: (tables.fournisseurs ?? []).find((f) => f.id === m.fournisseur_id) ?? null }))
        for (const [c, asc] of [...op.tri].reverse()) sel.sort((x, y) => ((x[c] ?? '') < (y[c] ?? '') ? -1 : (x[c] ?? '') > (y[c] ?? '') ? 1 : 0) * (asc ? 1 : -1))
        return { data: sel.slice(op.de, op.a + 1), error: null }
      }
      return b
    },
  }
}

// ── Les données « d'AVANT le CRM » : aucun chantier, aucune tâche ; des lignes écrites par les écrans historiques. Rien de réel.
const fiche = { id: A, plan: 'signature', metier: 'Plombier chauffagiste', forme_juridique: 'SARL', nom: 'Atelier Essai Durand', ville: 'Niort', adresse: '1 rue des Essais', code_postal: '79000' }
const tables = {
  artisans: [fiche, { id: B, plan: 'signature', metier: 'Maçon', nom: 'Autre Compte', ville: 'Lyon' }],
  leads: [
    { id: U(10), artisan_id: A, statut: 'nouveau', nom_prospect: 'Mme Essai', contact: 'essai@presti-test.invalid', canal: 'plateforme', type_chantier: 'Salle de bain', ville: 'Niort', created_at: ilYa(2) },
    { id: U(90), artisan_id: B, statut: 'nouveau', nom_prospect: 'CLIENT-DE-B', contact: 'b@presti-test.invalid', canal: 'plateforme', type_chantier: 'Mur', ville: 'Lyon', created_at: ilYa(1) },
  ],
  devis: [{ id: U(91), artisan_id: B, lead_id: U(90), statut: 'accepte', numero: 'DEV-B-0001', objet: 'Mur de B', client_nom: 'CLIENT-DE-B', client_email: null, client_adresse: null, total_ttc: 999, total_ht: 900, acompte_pct: 0, date_emission: '2026-10-01', envoye_le: ilYa(15), accepte_le: ilYa(10), created_at: ilYa(20), validite_jours: 90 }],
  factures: [{ id: U(92), artisan_id: B, devis_id: U(91), statut: 'emise', numero: 'FAC-B-0001', objet: 'Mur de B', total_ttc: 999, acompte_pct: null, avoir_de: null, date_emission: '2026-09-01', date_echeance: '2026-10-01', client_nom: 'CLIENT-DE-B', client_email: null, client_id: null }],
  materiaux: [{ id: U(20), artisan_id: A, nom: 'Raccord laiton 15', unite: 'u', categorie: 'Plomberie', seuil_alerte: 5, fournisseur_prefere: null, prix_vu_ht: 1.2, prix_vu_le: '2026-10-01', fournisseur_id: null },
    { id: U(93), artisan_id: B, nom: 'ARTICLE-DE-B', unite: 'u', categorie: null, seuil_alerte: 1, fournisseur_prefere: null, prix_vu_ht: null, prix_vu_le: null, fournisseur_id: null }],
  stock: [{ materiau_id: U(20), lieu: 'atelier', quantite: 30 }, { materiau_id: U(93), lieu: 'atelier', quantite: 4 }],
  mouvements_stock: [],
  fournisseurs: [],
  chantiers: [], chantier_taches: [], crm_journal: [], clients: [], vehicules: [], equipe_membres: [], chantier_equipe: [], chantier_materiaux: [],
  commandes_fournisseur: [], crm_rappels: [],
}
const db = fauxClient(tables)
const ecrites = new Set() // les tables qu'un geste rejoué a écrites (F : elles doivent toutes être écoutées)
const ecrire = (t, f) => { ecrites.add(t); f(tables[t]) }

async function relire() {
  requetes.length = 0
  const d = await Srv.chargerDossiers(A, db)
  if (!d.ok) throw new Error('lecture : ' + JSON.stringify(d.erreur))
  // Ce que la route passe à la vue (app/api/crm/vue/route.ts) : la fiche lue par gardeCrm, drapeau crmAtelierVivant levé.
  const vue = construireVue({ uid: A, metier: fiche.metier, ...(VIVANT ? { formeJuridique: fiche.forme_juridique, entreprise: { nom: fiche.nom, ville: fiche.ville }, carte: { base: null, validationAuto: false } } : {}), d, maintenant: MAINTENANT, idDe: (c) => `cli-${c}` })
  return { vue, d, salle: Acc.salleAttente(vue, JOUR), poste: Pos.posteAssistants(vue, JOUR), req: [...requetes] }
}
const colonne = (vue, etape) => vue.pipeline.colonnes.find((c) => c.etape === etape)?.cartes ?? []
const fileDe = (salle, cle) => salle.files.find((f) => f.cle === cle)
const texte = (o) => JSON.stringify(o)

// ═══════════════════════ État initial ═══════════════════════
const v0 = await relire()
T('0 la lecture du CRM (chargerDossiers, la vraie) passe sur les données d’avant le CRM : aucun chantier, la demande du compte est dans « Nouvelles demandes »', v0.vue.chantiers.length === 0 && fileDe(v0.salle, 'nouvelles').lignes.some((l) => l.client === 'Mme Essai'), texte(fileDe(v0.salle, 'nouvelles')))

// ═══════════════════════ A. Le devis ═══════════════════════
ecrire('devis', (t) => t.push({ id: U(30), artisan_id: A, lead_id: U(10), statut: 'brouillon', numero: 'DEV-2026-0042', objet: 'Remplacement chauffe-eau', client_nom: 'Mme Essai', client_email: 'essai@presti-test.invalid', client_adresse: '3 rue du Test, 79000 Niort', total_ttc: 1320, total_ht: 1200, acompte_pct: 30, date_emission: '2026-10-21', envoye_le: null, accepte_le: null, created_at: ilYa(0.5), validite_jours: 90 }))
const vA1 = await relire()
T('A1 devis CRÉÉ (écran Devis, brouillon) → la salle d’attente le montre « devis en préparation » avec « Ouvrir le brouillon »', fileDe(vA1.salle, 'nouvelles').lignes.some((l) => /devis en préparation/.test(l.detail) && l.action?.href === `/devis/${U(30)}`), texte(fileDe(vA1.salle, 'nouvelles').lignes))
ecrire('devis', (t) => Object.assign(t.find((x) => x.id === U(30)), { statut: 'envoye', envoye_le: ilYa(9) }))
ecrire('leads', (t) => Object.assign(t.find((x) => x.id === U(10)), { statut: 'repondu' }))
const vA2 = await relire()
T('A2 devis ENVOYÉ (POST /api/devis/[id]/envoyer → enregistrerEnvoi) → pipeline « devis envoyé » et file « Devis en attente du client » avec son numéro', colonne(vA2.vue, 'devis_envoye').some((c) => c.devisId === U(30)) && fileDe(vA2.salle, 'devis').lignes.some((l) => /DEV-2026-0042/.test(l.detail)), texte(fileDe(vA2.salle, 'devis')))
T('A3 envoyé il y a 9 jours sans réponse → le Relanceur du poste des assistants le prépare (lien vers le devis, rien n’est envoyé)', vA2.poste.assistants.find((a) => a.cle === 'relanceur').elements.some((e) => e.cle === U(30) && e.href === `/devis/${U(30)}`), texte(vA2.poste.assistants.find((a) => a.cle === 'relanceur')))
ecrire('devis', (t) => Object.assign(t.find((x) => x.id === U(30)), { statut: 'accepte', accepte_le: ilYa(1) }))
const vA4 = await relire()
T('A4 devis ACCEPTÉ (signature du client) → pipeline « signé », file « Signés, à planifier » avec « Créer le chantier », et CHANTIER PROPOSÉ (devisSignesSansChantier)',
  colonne(vA4.vue, 'signe').some((c) => c.devisId === U(30)) && fileDe(vA4.salle, 'signes').lignes.some((l) => l.action?.libelle === 'Créer le chantier') && vA4.vue.devisSignesSansChantier.some((x) => x.id === U(30) && x.numero === 'DEV-2026-0042'),
  texte(vA4.vue.devisSignesSansChantier))
T('A5 les chiffres suivent : « signé ce mois » compte le devis accepté (1 320 €)', (vA4.vue.tableau.signeMois?.nombre ?? 0) >= 1 && Math.round(vA4.vue.tableau.signeMois?.montant ?? 0) >= 1320, texte(vA4.vue.tableau.signeMois))

// ═══════════════════════ B. La facture ═══════════════════════
ecrire('factures', (t) => t.push({ id: U(40), artisan_id: A, devis_id: U(30), statut: 'emise', numero: 'FAC-2026-0007', objet: 'Acompte 30 %', total_ttc: 396, acompte_pct: 30, avoir_de: null, date_emission: '2026-09-25', date_echeance: '2026-10-10', client_nom: 'Mme Essai', client_email: 'essai@presti-test.invalid', client_id: null }))
const vB1 = await relire()
const enc1 = vB1.poste.assistants.find((a) => a.cle === 'encaissement')
if (VIVANT) T('B1 facture ÉMISE et échue (écran Factures) → poste des assistants, Encaissement : « Facture FAC-2026-0007 · Mme Essai », échue depuis 11 j', enc1.elements.some((e) => e.cle === U(40) && /FAC-2026-0007/.test(e.libelle) && /11 j/.test(e.detail)), texte(enc1))
else T('B1 (drapeau crmAtelierVivant baissé) : pas de poste des assistants, la vue n’a pas de champ vivant', !('vivant' in vB1.vue))
T('B2 les chiffres suivent : « À encaisser » existe et compte ce dossier', (vB1.vue.tableau.aEncaisser?.montant ?? 0) > 0 && (vB1.vue.tableau.aEncaisser?.dossiers ?? 0) >= 1, texte(vB1.vue.tableau.aEncaisser))
ecrire('factures', (t) => Object.assign(t.find((x) => x.id === U(40)), { statut: 'payee' }))
const vB3 = await relire()
const enc3 = vB3.poste.assistants.find((a) => a.cle === 'encaissement')
T('B3 facture PAYÉE (PATCH /api/factures/[id]) → elle SORT de l’encaissement ; « À encaisser » baisse', !enc3.elements.some((e) => e.cle === U(40)) && (vB3.vue.tableau.aEncaisser?.montant ?? 0) < (vB1.vue.tableau.aEncaisser?.montant ?? 0), `${vB1.vue.tableau.aEncaisser?.montant} → ${vB3.vue.tableau.aEncaisser?.montant}`)

// ═══════════════════════ C. L'inventaire ═══════════════════════
ecrire('materiaux', (t) => t.push({ id: U(21), artisan_id: A, nom: 'Joint fibre 20x27', unite: 'u', categorie: 'Plomberie', seuil_alerte: 10, fournisseur_prefere: null, prix_vu_ht: 0.3, prix_vu_le: '2026-10-20', fournisseur_id: null }))
ecrire('stock', (t) => t.push({ materiau_id: U(21), lieu: 'atelier', quantite: 12 }))
ecrire('mouvements_stock', (t) => t.push({ artisan_id: A, materiau_id: U(21), type: 'entree', quantite: 12, lieu: 'atelier' }))
const vC1 = await relire()
const joint1 = vC1.vue.atelier.materiaux.find((m) => m.id === U(21))
T('C1 article CRÉÉ dans Inventaire (POST /api/inventaire, quantité initiale par appliquer_mouvement) → stock de l’atelier : 12 u, seuil 10', !!joint1 && joint1.reste === 12 && joint1.seuil === 10, texte(joint1))
ecrire('stock', (t) => { t.find((s) => s.materiau_id === U(21)).quantite = 7 })
ecrire('mouvements_stock', (t) => t.push({ artisan_id: A, materiau_id: U(21), type: 'sortie', quantite: 5, lieu: 'atelier' }))
const vC2 = await relire()
const joint2 = vC2.vue.atelier.materiaux.find((m) => m.id === U(21))
T('C2 SORTIE de 5 → le reste de l’atelier passe à 7, sous le seuil : le stock bas des chiffres le compte', joint2?.reste === 7 && (vC2.vue.tableau.stockBas?.liste ?? []).some((m) => m.id === U(21)), texte({ joint2, stockBas: vC2.vue.tableau.stockBas }))
const sqlMvt = lire('supabase/migrations/0040_inventaire.sql')
T('C3 toute variation du stock écrit AUSSI mouvements_stock (appliquer_mouvement) : écouter mouvements_stock suffit, la table stock (sans artisan_id) n’a pas à l’être', /insert into mouvements_stock/.test(sqlMvt) && /update stock set/.test(sqlMvt) && /rpc\('appliquer_mouvement'/.test(lire('app/api/inventaire/route.ts')))

// ═══════════════════════ D. La fiche de l'artisan → l'atelier ═══════════════════════
{
  const srv = sansCommentaires(lire('lib/crm/serveur.ts'))
  const route = sansCommentaires(lire('app/api/crm/vue/route.ts'))
  T('D1 gardeCrm lit, drapeau crmAtelierVivant levé, metier, forme_juridique, nom, ville, adresse et code postal de la fiche (filtre id = uid de la session)', /'plan, metier, forme_juridique, nom, ville, adresse, code_postal'/.test(srv) && /from\('artisans'\)\.select\(COLONNES_FICHE\(\)\)\.eq\('id', session\.uid\)/.test(srv))
  T('D2 la route passe métier, forme juridique et entreprise (nom, ville) à la vue, et l’adresse du siège à la carte', /metier: g\.metier/.test(route) && /formeJuridique: g\.formeJuridique/.test(route) && /entreprise: g\.entreprise/.test(route) && /siege: g\.siege/.test(route))
  const at = vC2.vue.atelier
  if (VIVANT) {
    T('D3 l’atelier reprend la fiche telle quelle : métier, forme juridique, nom et ville', at.metier === fiche.metier && at.formeJuridique === 'SARL' && at.entreprise?.nom === 'Atelier Essai Durand' && at.entreprise?.ville === 'Niort', texte({ metier: at.metier, f: at.formeJuridique, e: at.entreprise }))
    T('D4 le métier choisit le décor 3D (chauffagiste, pas maçon) et la forme juridique lue décide du statut de l’infrastructure (SARL à 3 → société ; la même équipe en EI → à son compte)', Infra.metier3DDe(at.metier) !== Infra.metier3DDe('Maçon') && Infra.statutDe(at.formeJuridique, 3) === 'societe' && Infra.statutDe('EI', 3) === 'a_son_compte', `${Infra.metier3DDe(at.metier)} / ${Infra.statutDe(at.formeJuridique, 3)}`)
  } else T('D3 (drapeau crmAtelierVivant baissé) : seul le métier est passé', at.metier === fiche.metier)
}

// ═══════════════════════ E. La demande /p → l'arrivée en direct ═══════════════════════
{
  const avant = Acc.arriveesDe(vC2.vue.atelier.demandes)
  ecrire('leads', (t) => t.push({ id: U(11), artisan_id: A, statut: 'nouveau', nom_prospect: 'M. Arrivee', contact: 'arrivee@presti-test.invalid', canal: 'plateforme', type_chantier: 'Fuite sous évier', ville: 'Niort', created_at: MAINTENANT.toISOString() }))
  const vE = await relire()
  const nouvelles = Acc.nouvellesArrivees(avant, Acc.arriveesDe(vE.vue.atelier.demandes))
  T('E1 une demande arrive par la page /p (POST /api/leads insère dans leads) → l’arrivée en direct la détecte (une seule, la nouvelle) et la bannière la nomme', nouvelles.length === 1 && nouvelles[0].id === U(11) && /Arrivee/.test(Acc.texteArrivee(nouvelles)), texte(nouvelles))
  T('E2 elle entre dans « Nouvelles demandes » avec « Répondre » vers SA conversation', fileDe(vE.salle, 'nouvelles').lignes.some((l) => l.client === 'M. Arrivee' && l.action?.href === `/messages?lead=${U(11)}`), texte(fileDe(vE.salle, 'nouvelles').lignes))
  const leadsRoute = sansCommentaires(lire('app/api/leads/route.ts'))
  T('E3 la route /p écrit bien dans leads (la table écoutée), filtrée sur l’artisan de la page', /from\('leads'\)[\s\S]{0,400}\.insert\(/.test(leadsRoute) && /artisan_id: artisan\.id/.test(leadsRoute))
}

// ═══════════════════════ F. Le temps réel : ce qui est lu est écouté (ou écarté, avec sa raison) ═══════════════════════
const vF = await relire()
{
  // Les tables réellement lues par chargerDossiers (relevé de la doublure) + leurs jointures (stock(…), fournisseur:fournisseurs(…)),
  // + la fiche (gardeCrm) et les réglages (lireReglages), relevés dans la source.
  const lues = new Set(vF.req.map((r) => r.table))
  for (const r of vF.req) for (const m of r.select.matchAll(/(?:\w+:)?(\w+)\(/g)) lues.add(m[1])
  const srv = sansCommentaires(lire('lib/crm/serveur.ts'))
  const iGarde = srv.indexOf('export async function gardeCrm'), iFin = srv.indexOf('export function statutErreurBase')
  for (const m of srv.slice(iGarde, iFin).matchAll(/from\('(\w+)'\)/g)) lues.add(m[1])
  const iReg = srv.indexOf('export async function lireReglages')
  for (const m of srv.slice(iReg, srv.indexOf('\n}', iReg)).matchAll(/from\('(\w+)'\)/g)) lues.add(m[1])
  const listees = new Set(Tr.SOURCES_VUE)
  T('F1 la liste SOURCES_VUE de lib/crm/tempsReel.ts est EXACTEMENT ce que la vue lit (recalculé depuis le code : rien d’oublié, rien d’inventé)', [...lues].every((t) => listees.has(t)) && [...listees].every((t) => lues.has(t)), `lues : ${[...lues].sort().join(', ')} | listées : ${[...listees].sort().join(', ')}`)
  const ecoutees = new Set(Tr.tablesEcoutees(true))
  const ni = [...lues].filter((t) => !ecoutees.has(t) && !Tr.HORS_TEMPS_REEL[t])
  const lesDeux = [...lues].filter((t) => ecoutees.has(t) && Tr.HORS_TEMPS_REEL[t])
  T('F2 chaque table lue est ÉCOUTÉE (0175 comprise) ou ÉCARTÉE avec sa raison (au moins 60 caractères), jamais les deux', ni.length === 0 && lesDeux.length === 0 && Object.values(Tr.HORS_TEMPS_REEL).every((r) => r.length >= 60), `ni l’un ni l’autre : ${ni.join(', ')} · les deux : ${lesDeux.join(', ')}`)
  T('F3 la fiche artisan n’est PAS diffusée par le temps réel (elle porte offre, crédits, identifiants Stripe) : écartée, et absente de toutes les migrations de publication', !ecoutees.has('artisans') && !!Tr.HORS_TEMPS_REEL.artisans)
  // La publication, d'après les migrations : foreach … array[…] (0158, 0175) et alter publication … add table (0162).
  const publiees = new Set()
  for (const f of fs.readdirSync(path.join(RACINE, 'supabase/migrations')).filter((x) => /^\d{4}_.*\.sql$/.test(x))) {
    const sql = lire(`supabase/migrations/${f}`).replace(/^\s*--.*$/gm, '')
    if (!/supabase_realtime/.test(sql)) continue
    for (const m of sql.matchAll(/alter publication supabase_realtime add table public\.(\w+)/g)) publiees.add(m[1])
    for (const m of sql.matchAll(/foreach t in array array\[([^\]]+)\][\s\S]{0,400}?alter publication supabase_realtime add table/g)) for (const t of m[1].split(',')) publiees.add(t.replace(/['\s]/g, ''))
  }
  const nonPubliees = [...ecoutees].filter((t) => !publiees.has(t))
  T('F4 chaque table écoutée est dans la publication supabase_realtime d’une migration (0158, 0162, 0175) ; rien de publié qui ne soit écouté', nonPubliees.length === 0 && [...publiees].every((t) => ecoutees.has(t)), `non publiées : ${nonPubliees.join(', ')} · publiées : ${[...publiees].sort().join(', ')}`)
  const nonEcoutees = [...ecrites].filter((t) => !ecoutees.has(t) && !(t === 'stock' && ecrites.has('mouvements_stock')))
  T('F5 chaque table qu’un geste rejoué ci-dessus a écrite (devis, leads, factures, materiaux, mouvements_stock) est écoutée — stock passe par mouvements_stock', nonEcoutees.length === 0 && ['devis', 'leads', 'factures', 'materiaux', 'mouvements_stock'].every((t) => ecrites.has(t)), [...ecrites].join(', '))
  const ab = Tr.abonnements(A, [], true)
  T('F6 abonnements, 0175 comprise : un par table écoutée, filtre artisan_id=eq.<uid> du compte, tous évènements', ab.length === ecoutees.size && ab.every((x) => x.filter === `artisan_id=eq.${A}` && x.event === '*' && x.schema === 'public'))
  const sansDrapeau = Tr.abonnements(A, [], false).map((x) => x.table)
  T('F7 drapeau crmTempsReelComplet baissé : clients et crm_journal ne sont PAS écoutés (0175 pas encore collée : le canal entier tomberait), les 13 d’avant le sont', Tr.TABLES_APRES_0175.every((t) => !sansDrapeau.includes(t)) && sansDrapeau.length === Tr.TABLES_TEMPS_REEL.length)
  T('F8 l’écran branche ces abonnements tels quels (app/crm/useTempsReel.ts : abonnements(uid, …) puis une relecture de GET /api/crm/vue)', /abonnements\(uid,/.test(lire('app/crm/useTempsReel.ts')) && /postgres_changes/.test(lire('app/crm/useTempsReel.ts')))
  const m0175 = lire('supabase/migrations/0175_crm_temps_reel_complet.sql')
  T('F9 migration 0175 : appliquée (dit en tête, datée), idempotente (if not exists), jumeau _NU et contrôle présents ; le drapeau levé APRÈS', /APPLIQUÉE le 21\/10\/2026/.test(m0175.slice(0, 600)) && /if not exists \(select 1 from pg_publication_tables/.test(m0175) && fs.existsSync(path.join(RACINE, 'supabase/migrations/_A_COLLER_sql_editor_0175_NU.sql')) && fs.existsSync(path.join(RACINE, 'supabase/controles/0175_crm_temps_reel_complet.sql')) && FLAGS.crmTempsReelComplet === true)
}

// ═══════════════════════ G. Isolation : artisan_id = uid partout ═══════════════════════
{
  const sansFiltre = vF.req.filter((r) => r.eqs.artisan_id !== A)
  T('G1 chaque requête de la lecture du CRM porte artisan_id = uid de la session (relevé de la doublure : ' + vF.req.length + ' requêtes)', vF.req.length >= 14 && sansFiltre.length === 0, sansFiltre.map((r) => r.table).join(', '))
  const tout = texte(vF.vue)
  T('G2 aucune ligne de l’autre compte ne paraît dans la vue, la salle d’attente ni le poste des assistants (demande, devis, facture, article de B)', !/CLIENT-DE-B|DEV-B-0001|FAC-B-0001|ARTICLE-DE-B/.test(tout + texte(vF.salle) + texte(vF.poste)) && ![U(90), U(91), U(92), U(93)].some((id) => tout.includes(id)))
}

// ═══════════════════════ H. Lanceur ═══════════════════════
T('H1 la suite est au tableau SUITES de scripts/tout-verifier.mjs (coût gratuit)', /scripts\/crm-connecte-qa\.mjs'\][^\n]*cout: 'gratuit'/.test(lire('scripts/tout-verifier.mjs')))

console.log(`\n${verts} vert(s), ${rouges.length} rouge(s)`)
if (rouges.length) { console.log('Rouges : ' + rouges.join(' | ')); process.exit(1) }
