// Juge HORS LIGNE du lot L19 du chantier 4 — les demandes de démo « Presti pour l'entreprise » (tâche 032-026).
//
// Il juge, sans réseau, sans base, sans clé ni modèle :
//   A. le DRAPEAU : `demandesDemo` baissé dans lib/flags.ts ;
//   B. /api/contact (`traiterContact`, lib/demandesDemo.ts) contre un ORACLE : le code de la route d'avant le 02/11, recopié ici mot
//      pour mot. Drapeau baissé : même réponse et mêmes appels (ban, piège, plafond, e-mail : sujet, corps, Reply-To) à l'octet près,
//      sur des cas écrits et 400 corps tirés au hasard, et aucune écriture. Levé : une demande de démo valide est écrite (ligne exacte)
//      ET l'e-mail part ; écriture en panne (faux, exception) = e-mail quand même ; e-mail en panne et demande rangée = 200 ; les deux
//      en panne = 502 ; motif, taille ou activité hors liste = jamais rangé, mais l'e-mail part comme avant (la demande n'est jamais
//      perdue) ; aucune coordonnée dans un journal de traiterContact (celui de notifierEntreprise, lib/email.ts, est hors de ce lot) ;
//   C. les ROUTES : app/api/contact/route.ts et app/api/controle/demandes-demo/route.ts ne sont que des branchements ;
//   D. le POSTE (`listeDemandesDemo`, `marquerDemandeTraitee`) avec un faux client qui enregistre la chaîne : drapeau baissé = 404
//      sans garde ; refus de la garde transmis ; partenaire (matrice réelle de lib/controle/droits.ts) refusé ; colonnes, ordre,
//      plafond ; le geste « traitée » journalisé d'abord, conditionnel (`etat = nouvelle`), rejoué sans effet, inconnu = 404 ;
//   E. l'ÉCRAN : l'onglet « Démos » n'existe que drapeau levé ; il appelle la route protégée ; aucun HTML injecté ;
//   F. la MIGRATION 0190 : « NON APPLIQUÉE », retour arrière, RLS, droits retirés, gardes de 0138, listes égales à celles du code,
//      sans IP, n8n sans coordonnées ; le jumeau porte le même SQL ;
//   G. l'EXPORT n8n (.orchestre/preuves/032-026/presti-demande-demo.workflow.json, tiré du n8n d'Oracle par le MCP) : inactif, jamais
//      publié ; nœuds permis ; chaîne exacte ; lectures en GET au gabarit exact, sans coordonnées ; un seul envoi, Slack #presti-auto,
//      à Benj ; réglages en liste blanche ; aucun secret ; empreintes SHA-256 du code ;
//   H. le REJEU du code des nœuds (contexte vm) : l'essai épinglé de n8n rendu à l'identique ; trois jours de passages tirés au hasard :
//      chaque demande prévenue exactement une fois, relancée exactement une fois si elle n'est pas traitée à J+2, jamais sinon ; ni
//      prénom, ni adresse, ni message dans une sortie ;
//   I. les MUTANTS : chacun doit faire rougir la suite.
//
// Lancement : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/demandes-demo-qa.mjs
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { tmpdir } from 'node:os'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { peutFaire } from '../lib/controle/droits.ts'
import { sansCommentaires } from './sql-nu.mjs'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lire = (f) => readFileSync(path.join(RACINE, f), 'utf8')
const CHEMINS = {
  lib: 'lib/demandesDemo.ts', flags: 'lib/flags.ts', route: 'app/api/contact/route.ts', poste: 'app/api/controle/demandes-demo/route.ts',
  page: 'app/controle/page.tsx', ecran: 'app/controle/DemandesDemo.tsx', migration: 'supabase/migrations/0190_demandes_demo.sql',
  jumeau: 'supabase/migrations/_A_COLLER_sql_editor_0190_NU.sql', brief: 'plans/011-cadrage-01-11/briefs/c4-n8n-demande-demo.md',
  export: '.orchestre/preuves/032-026/presti-demande-demo.workflow.json', essai: '.orchestre/preuves/032-026/essai-n8n.json',
}
const copie = (x) => JSON.parse(JSON.stringify(x))
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b)
const sha256 = (s) => createHash('sha256').update(String(s), 'utf8').digest('hex')

// Les listes fermées, écrites ICI une seconde fois (formulaire du chantier 2, c2-lot4/texte.md:284-285) : le code doit les égaler.
const TAILLES = ['1', '2 à 5', '6 à 20', 'plus de 20']
const ACTIVITES = ['Artisan', 'Entreprise du bâtiment', 'Architecte', 'Autre']
const COORDONNEES = ['prenom', 'email', 'message', 'nom', 'tel', 'ip']

// ─── B. L'oracle : app/api/contact/route.ts AVANT le 02/11, recopié mot pour mot (seuls `deps.*` remplacent les imports) ──────────
const clipAvant = (v, n) => { if (typeof v !== 'string') return null; const t = v.trim(); return t ? t.slice(0, n) : null }
const EMAIL_AVANT = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
async function avant(d) {
  const json = (corps, init) => ({ statut: init?.status ?? 200, corps })
  try {
    const ip = d.ip()
    if (await d.banni(ip)) return json({ error: 'Accès refusé.' }, { status: 403 })
    const body = await d.corps().catch(() => null)
    if (clipAvant(body?.societe, 50)) {
      await d.abus(ip, 'honeypot /api/contact')
      return json({ ok: true })
    }
    const nom = clipAvant(body?.nom, 120)
    const email = clipAvant(body?.email, 200)
    const message = clipAvant(body?.message, 4000)
    if (!nom || !email || !message) return json({ error: 'Il manque votre nom, votre email ou votre message.' }, { status: 400 })
    if (!EMAIL_AVANT.test(email)) return json({ error: 'Cette adresse email ne semble pas valide.' }, { status: 400 })
    if (message.length < 10) return json({ error: 'Dites-nous un peu plus, en une phrase au moins.' }, { status: 400 })
    if (!(await d.limite(`contact:${ip}`, 3, 3600))) {
      await d.abus(ip, 'flood /api/contact')
      return json({ error: 'Vous avez déjà écrit plusieurs fois : laissez-nous le temps de répondre.' }, { status: 429 })
    }
    const r = await d.notifier(
      `Message de ${nom}`,
      `${message}\n\n— ${nom} · ${email}\n(envoyé depuis le formulaire de contact de prestiapp.fr)`,
      email,
    )
    if (!r.ok) return json({ error: 'Votre message n’a pas pu partir. Réessayez dans un moment.' }, { status: 502 })
    return json({ ok: true })
  } catch (e) {
    return json({ error: 'Service momentanément indisponible' }, { status: 500 })
  }
}

/** De fausses dépendances qui enregistrent chaque appel, dans l'ordre. */
function fausses({ drapeau = false, banni = false, limite = true, notifie = true, enregistre = true, corps, corpsJette = false, ipJette = false } = {}) {
  const appels = []
  return {
    appels,
    d: {
      drapeau,
      ip: () => { if (ipJette) throw new Error('ip illisible'); appels.push(['ip']); return '203.0.113.7' },
      banni: async (ip) => { appels.push(['banni', ip]); return banni },
      abus: async (ip, raison) => { appels.push(['abus', ip, raison]); return true },
      limite: async (cle, max, f) => { appels.push(['limite', cle, max, f]); return limite },
      corps: async () => { appels.push(['corps']); if (corpsJette) throw new SyntaxError('JSON illisible'); return copie(corps ?? null) },
      notifier: async (sujet, texte, repondreA) => { appels.push(['notifier', sujet, texte, repondreA]); return { ok: notifie } },
      enregistrer: async (ligne) => { appels.push(['enregistrer', copie(ligne)]); if (enregistre === 'jette') throw new Error('base muette'); return enregistre },
    },
  }
}

const DEMO = { nom: 'Prénom-essai', email: 'demandeur@exemple.invalid', societe: '', motif: 'entreprise', taille: '2 à 5', activite: 'Architecte',
  message: '[Démo entreprise] Équipe : 2 à 5 · activité : Architecte\n\nVoir la relance des devis.' }
const CONTACT = { nom: 'Nom-essai', email: 'contact@exemple.invalid', message: 'Une question sur la facturation, merci.' }
const CORPS_ECRITS = [
  null, 'texte', 42, [], {}, CONTACT, { ...CONTACT, societe: 'robot' }, { ...CONTACT, email: 'pas-une-adresse' }, { ...CONTACT, message: 'court' },
  { ...CONTACT, nom: '   ' }, { ...CONTACT, message: 'x'.repeat(5000) }, { ...CONTACT, nom: 'N'.repeat(300) }, DEMO,
  { ...DEMO, taille: 'beaucoup' }, { ...DEMO, activite: 'Plombier' }, { ...DEMO, motif: 'presse' }, { ...CONTACT, taille: '1' },
  { ...DEMO, message: '[Démo entreprise] Équipe : 2 à 5 · activité : Architecte' }, { ...DEMO, taille: 5 }, { ...DEMO, motif: ' entreprise' },
]
function lcg(graine) { let x = graine >>> 0; return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 2 ** 32 } }
function corpsTires(n, graine) {
  const h = lcg(graine), choisir = (l) => l[Math.floor(h() * l.length)]
  const valeurs = [undefined, null, '', ' ', 'Prénom', 'a@b.cd', 'x'.repeat(12), 'entreprise', 'presse', '1', '2 à 5', 'plus de 20', 'Autre',
    'Architecte', 'Plombier', 7, true, ['a'], { a: 1 }, 'robot', '[Démo entreprise] Équipe : 1 · activité : Autre', 'nom@exemple.invalid']
  const cles = ['nom', 'email', 'message', 'societe', 'motif', 'taille', 'activite']
  return Array.from({ length: n }, () => Object.fromEntries(cles.filter(() => h() < 0.8).map((k) => [k, choisir(valeurs)])))
}
const CONDITIONS = [{}, { banni: true }, { limite: false }, { notifie: false }, { corpsJette: true }, { ipJette: true }]

async function capturerJournal(f) {
  const ancien = console.error, lignes = []
  console.error = (...a) => { lignes.push(a.map((x) => (x instanceof Error ? x.message : String(x))).join(' ')) }
  try { return { r: await f(), lignes } } finally { console.error = ancien }
}

async function jugerContact(lib, e) {
  // B1. Drapeau baissé : l'oracle, à l'octet près, et jamais une écriture.
  const corps = [...CORPS_ECRITS, ...corpsTires(250, 26)]
  let compares = 0
  for (const c of corps) for (const cond of CONDITIONS) {
    const a = fausses({ ...cond, corps: c }), b = fausses({ ...cond, corps: c })
    const ra = await capturerJournal(() => avant(a.d)), rb = await capturerJournal(() => lib.traiterContact(b.d))
    compares++
    if (!egal(ra.r, rb.r) || !egal(a.appels, b.appels)) { e.push(`drapeau baissé : écart avec la route d'avant (corps ${JSON.stringify(c)?.slice(0, 80)}, ${JSON.stringify(cond)})`); return }
    if (b.appels.some((x) => x[0] === 'enregistrer')) { e.push('drapeau baissé : une écriture en base'); return }
  }
  // B2. Drapeau levé, message ordinaire (aucun des trois champs) : toujours l'oracle.
  for (const c of [CONTACT, { ...CONTACT, societe: 'robot' }, { ...CONTACT, email: 'x' }]) {
    const a = fausses({ corps: c }), b = fausses({ drapeau: true, corps: c })
    const ra = await avant(a.d), rb = await lib.traiterContact(b.d)
    if (!egal(ra, rb) || !egal(a.appels, b.appels)) e.push(`drapeau levé, contact ordinaire : écart avec la route d'avant (${JSON.stringify(c).slice(0, 60)})`)
  }
  // B3. Drapeau levé, demande valide : la ligne exacte, puis le même e-mail qu'avant.
  const ligneAttendue = { motif: 'entreprise', taille: '2 à 5', activite: 'Architecte', prenom: 'Prénom-essai', email: 'demandeur@exemple.invalid', message: 'Voir la relance des devis.' }
  {
    const a = fausses({ corps: DEMO }), b = fausses({ drapeau: true, corps: DEMO })
    const ra = await avant(a.d), rb = await lib.traiterContact(b.d)
    const ecritures = b.appels.filter((x) => x[0] === 'enregistrer')
    if (ecritures.length !== 1 || !egal(ecritures[0][1], ligneAttendue)) e.push(`drapeau levé : ligne écrite inattendue ${JSON.stringify(ecritures.map((x) => x[1]))}`)
    if (!egal(a.appels.filter((x) => x[0] === 'notifier'), b.appels.filter((x) => x[0] === 'notifier'))) e.push('drapeau levé : l’e-mail à Benj n’est plus celui d’avant')
    if (rb.statut !== 200 || !egal(rb, ra)) e.push(`drapeau levé : réponse ${rb.statut} au lieu de 200`)
    const iE = b.appels.findIndex((x) => x[0] === 'enregistrer'), iL = b.appels.findIndex((x) => x[0] === 'limite')
    if (!(iL >= 0 && iE > iL)) e.push('drapeau levé : l’écriture passe avant le plafond de 3 par heure')
  }
  // Le message composé seul (sans texte du demandeur) : message vide en base.
  {
    const b = fausses({ drapeau: true, corps: { ...DEMO, message: '[Démo entreprise] Équipe : 2 à 5 · activité : Architecte' } })
    await lib.traiterContact(b.d)
    const l = b.appels.find((x) => x[0] === 'enregistrer')?.[1]
    if (!l || l.message !== null) e.push('message composé seul : le message rangé devrait être vide')
    const c = fausses({ drapeau: true, corps: { ...DEMO, message: 'Un message libre, sans en-tête composé.' } })
    await lib.traiterContact(c.d)
    if (c.appels.find((x) => x[0] === 'enregistrer')?.[1]?.message !== 'Un message libre, sans en-tête composé.') e.push('message libre : il doit être rangé entier')
  }
  // B4. Écriture en panne : l'e-mail part quand même ; e-mail en panne seul : 200 ; les deux : 502. Aucune coordonnée au journal.
  for (const [cond, statut] of [[{ enregistre: false }, 200], [{ enregistre: 'jette' }, 200], [{ notifie: false }, 200], [{ enregistre: false, notifie: false }, 502], [{ enregistre: 'jette', notifie: false }, 502]]) {
    const b = fausses({ drapeau: true, corps: DEMO, ...cond })
    const { r, lignes } = await capturerJournal(() => lib.traiterContact(b.d))
    if (!b.appels.some((x) => x[0] === 'notifier')) e.push(`écriture en panne (${JSON.stringify(cond)}) : l’e-mail n’est pas parti`)
    if (r.statut !== statut) e.push(`${JSON.stringify(cond)} : statut ${r.statut} au lieu de ${statut}`)
    const journal = lignes.join('\n')
    if (/Prénom-essai|demandeur@exemple|relance des devis/.test(journal)) e.push(`${JSON.stringify(cond)} : une coordonnée du demandeur dans le journal`)
  }
  // B5. Hors liste : jamais rangé, mais la demande n'est pas perdue — même réponse et même e-mail qu'avant (audit distinct, point 1).
  for (const c of [{ ...DEMO, taille: 'beaucoup' }, { ...DEMO, taille: 5 }, { ...DEMO, activite: 'Plombier' }, { ...DEMO, motif: 'presse' }, { ...DEMO, motif: ' entreprise' },
    { ...CONTACT, taille: '1' }, { ...CONTACT, activite: 'Autre' }, { ...DEMO, motif: undefined }, { ...DEMO, taille: '2 À 5' }]) {
    const a = fausses({ corps: c }), b = fausses({ drapeau: true, corps: c })
    const { r, lignes } = await capturerJournal(() => lib.traiterContact(b.d))
    const ra = await avant(a.d)
    if (b.appels.some((x) => x[0] === 'enregistrer')) e.push(`hors liste rangé : ${JSON.stringify({ motif: c.motif, taille: c.taille, activite: c.activite })}`)
    if (!egal(r, ra) || !egal(b.appels, a.appels)) e.push(`hors liste : la demande est perdue ou l’e-mail diffère (${JSON.stringify({ motif: c.motif, taille: c.taille, activite: c.activite })} → ${r.statut})`)
    if (/Prénom-essai|demandeur@exemple|relance des devis|beaucoup|Plombier|presse/.test(lignes.join('\n'))) e.push('hors liste : une valeur ou une coordonnée au journal')
  }
  // Toutes les combinaisons valides passent.
  for (const t of TAILLES) for (const a of ACTIVITES) {
    const b = fausses({ drapeau: true, corps: { ...DEMO, taille: t, activite: a, message: 'Un message libre, assez long.' } })
    const r = await lib.traiterContact(b.d)
    if (r.statut !== 200 || b.appels.filter((x) => x[0] === 'enregistrer').length !== 1) e.push(`combinaison valide refusée : ${t} · ${a}`)
  }
  // B5 bis. Une moitié d'émoji (coupée par la limite de 120 signes) n'entre jamais en base : Postgres refuserait la ligne.
  {
    const nom = 'N'.repeat(119) + '😀'
    const b = fausses({ drapeau: true, corps: { ...DEMO, nom } })
    await lib.traiterContact(b.d)
    const l = b.appels.find((x) => x[0] === 'enregistrer')?.[1]
    if (!l || /[\uD800-\uDFFF]/.test(l.prenom) || l.prenom !== 'N'.repeat(119)) e.push('moitié de caractère rangée en base')
    const n = b.appels.find((x) => x[0] === 'notifier')
    const a = fausses({ corps: { ...DEMO, nom } }); await avant(a.d)
    if (!egal(n, a.appels.find((x) => x[0] === 'notifier'))) e.push('moitié de caractère : l’e-mail n’est plus celui d’avant')
  }
  // L'adresse d'un lien mailto : jamais de quoi ajouter une copie, un objet ou un corps.
  for (const [adr, ok] of [['demandeur@exemple.invalid', true], ['a@evil.example?cc=x%40y.fr&subject=Facture', false], ['a@b.fr#x', false], ['a@b.fr/x', false], ['a@b.fr&x', false]]) {
    if (lib.EMAIL_LIEN.test(adr) !== ok) e.push(`lien mailto : ${adr} ${ok ? 'refusée' : 'acceptée'}`)
  }
  // B6. Piège à robot : jamais une écriture, même levé.
  {
    const b = fausses({ drapeau: true, corps: { ...DEMO, societe: 'robot' } })
    await lib.traiterContact(b.d)
    if (b.appels.some((x) => x[0] === 'enregistrer' || x[0] === 'notifier')) e.push('piège à robot : une écriture ou un e-mail')
  }
  // Les listes du code égalent celles du formulaire.
  if (!egal([...lib.TAILLES], TAILLES) || !egal([...lib.ACTIVITES], ACTIVITES) || !egal([...lib.MOTIFS], ['entreprise']) || !egal([...lib.ETATS], ['nouvelle', 'traitee'])) {
    e.push('listes fermées du code différentes du formulaire')
  }
  return compares
}

// ─── D. Le Poste ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
function fauxClient(reponses) {
  const chaines = []
  let n = 0
  return {
    chaines,
    from(table) {
      const appels = [['from', table]]
      chaines.push(appels)
      const r = reponses[n++] ?? { data: null, error: { message: 'inattendu' } }
      const q = new Proxy({}, {
        get(_, k) {
          if (k === 'then') return (ok, ko) => (r === 'jette' ? Promise.reject(new Error('base muette')) : Promise.resolve(r)).then(ok, ko)
          return (...a) => { appels.push([k, ...a.map((x) => (x instanceof AbortSignal ? 'signal' : copie(x)))]); return q }
        },
      })
      return q
    },
  }
}
const UID = '0f0f0f0f-0000-4000-8000-000000000001'
const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const fondateur = (role = 'direction', roleInterne = 'fondateur') => ({ uid: UID, email: 'fondateur@exemple.invalid', role, roleInterne, iat: 0, ip: '203.0.113.9' })
const exigerReel = (f, domaine, verbe) => { const v = peutFaire(f.roleInterne, domaine, verbe); return v.permis ? { borne: v.borne } : { error: v.raison, status: 403, code: 'hors_perimetre' } }
function deps({ drapeau = true, garde = fondateur(), direction, journal = true, reponses = [] } = {}) {
  const trace = { garde: 0, journal: [] }
  const client = fauxClient(reponses)
  return {
    trace, client,
    d: {
      drapeau,
      estFondateur: async () => { trace.garde++; return garde },
      estDirection: async () => { trace.garde++; const g = direction ?? garde; return 'error' in g ? g : g.role !== 'direction' ? { error: 'Votre rôle est en lecture seule.', status: 403, code: 'lecture_seule' } : g },
      exigerDomaine: exigerReel,
      journaliser: async (entree) => { trace.journal.push(copie({ ...entree, acteur: entree.acteur.uid })); return journal },
      client,
      maintenant: () => new Date('2026-11-02T10:00:00.000Z'),
    },
  }
}
const requete = (corps) => new Request('https://qg.prestiapp.fr/api/controle/demandes-demo', { method: corps === undefined ? 'GET' : 'POST', body: corps === undefined ? undefined : JSON.stringify(corps) })
const LIGNE = { id: ID, motif: 'entreprise', taille: '6 à 20', activite: 'Autre', prenom: 'Prénom-essai', email: 'demandeur@exemple.invalid', message: null,
  etat: 'nouvelle', rendez_vous_le: null, traitee_le: null, cree_le: '2026-11-02T09:00:00+00:00', maj_le: '2026-11-02T09:00:00+00:00' }

async function jugerPoste(lib, e) {
  // Drapeau baissé : 404, la garde n'est même pas appelée, la base pas touchée.
  for (const f of [lib.listeDemandesDemo, lib.marquerDemandeTraitee]) {
    const x = deps({ drapeau: false })
    const r = await f(requete(f === lib.listeDemandesDemo ? undefined : { id: ID }), x.d)
    if (r.statut !== 404 || x.trace.garde !== 0 || x.client.chaines.length) e.push('drapeau baissé : le Poste répond ou lit')
  }
  // Refus de la garde (non connecté, non fondateur, plafond) : transmis tels quels, rien lu.
  for (const refus of [{ error: 'Réservé aux fondateurs.', status: 403 }, { error: 'Session expirée.', status: 401, code: 'jeton' }, { error: 'Trop d’appels.', status: 429, code: 'plafond' }]) {
    const x = deps({ garde: refus })
    const r = await lib.listeDemandesDemo(requete(), x.d)
    if (r.statut !== refus.status || x.client.chaines.length) e.push(`onglet ouvert à un compte refusé par la garde (${refus.status})`)
    const y = deps({ garde: refus })
    const s = await lib.marquerDemandeTraitee(requete({ id: ID }), y.d)
    if (s.statut !== refus.status || y.client.chaines.length || y.trace.journal.length) e.push(`geste « traitée » permis à un compte refusé (${refus.status})`)
  }
  // Partenaire (rôle d'entreprise borné) : refusé en lecture comme en écriture, par la matrice réelle.
  {
    const x = deps({ garde: fondateur('lecture', 'partenaire') })
    const r = await lib.listeDemandesDemo(requete(), x.d)
    if (r.statut !== 403 || x.client.chaines.length) e.push('onglet ouvert à un partenaire')
    const y = deps({ garde: fondateur('direction', 'partenaire') })
    const s = await lib.marquerDemandeTraitee(requete({ id: ID }), y.d)
    if (s.statut !== 403 || y.client.chaines.length) e.push('geste « traitée » permis à un partenaire')
  }
  // Lecture du fondateur : la chaîne exacte, et une ligne hors liste écartée.
  {
    const x = deps({ reponses: [{ data: [LIGNE, { ...LIGNE, id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', taille: 'beaucoup' }, { ...LIGNE, id: 'pas-un-uuid' }], error: null }] })
    const r = await lib.listeDemandesDemo(requete(), x.d)
    const attendu = [['from', 'demandes_demo'], ['select', lib.COLONNES_POSTE], ['order', 'etat', { ascending: true }], ['order', 'cree_le', { ascending: false }], ['limit', 200], ['abortSignal', 'signal']]
    if (!egal(x.client.chaines[0], attendu)) e.push(`lecture du Poste : chaîne inattendue ${JSON.stringify(x.client.chaines[0])}`)
    if (r.statut !== 200 || !egal(r.corps.demandes, [LIGNE])) e.push('lecture du Poste : lignes mal filtrées')
    const cols = lib.COLONNES_POSTE.split(',').map((s) => s.trim())
    if (!egal([...cols].sort(), ['activite', 'cree_le', 'email', 'etat', 'id', 'maj_le', 'message', 'motif', 'prenom', 'rendez_vous_le', 'taille', 'traitee_le'])) e.push('colonnes du Poste inattendues')
    for (const rep of [{ data: null, error: { message: 'relation "demandes_demo" does not exist' } }, 'jette']) {
      const y = deps({ reponses: [rep] })
      const s = await lib.listeDemandesDemo(requete(), y.d)
      if (s.statut !== 503) e.push('lecture du Poste : une base muette ne rend pas 503')
    }
    const z = deps({ garde: fondateur('lecture', 'fondateur'), reponses: [{ data: [], error: null }] })
    const t = await lib.listeDemandesDemo(requete(), z.d)
    if (t.statut !== 200 || t.corps.role !== 'lecture') e.push('lecture du Poste : le rôle lecture devrait voir la liste')
  }
  // Le geste « traitée ».
  {
    const x = deps({ reponses: [{ data: [{ id: ID, etat: 'traitee', traitee_le: '2026-11-02T10:00:00.000Z' }], error: null }] })
    const r = await lib.marquerDemandeTraitee(requete({ id: ID }), x.d)
    const attendu = [['from', 'demandes_demo'], ['update', { etat: 'traitee', traitee_le: '2026-11-02T10:00:00.000Z', traitee_par: UID }], ['eq', 'id', ID], ['eq', 'etat', 'nouvelle'],
      ['select', 'id, etat, traitee_le'], ['abortSignal', 'signal']]
    if (r.statut !== 200 || r.corps.deja !== false) e.push(`geste « traitée » : réponse ${r.statut}`)
    if (!egal(x.client.chaines[0], attendu)) e.push(`geste « traitée » : mise à jour non conditionnelle ou inattendue ${JSON.stringify(x.client.chaines[0])}`)
    if (x.trace.journal.length !== 1 || x.trace.journal[0].cible_type !== 'demande_demo' || x.trace.journal[0].cible_id !== ID || x.trace.journal[0].acteur !== UID) e.push('geste « traitée » non journalisé')
    if (JSON.stringify(x.trace.journal).includes('demandeur@')) e.push('geste « traitée » : une coordonnée au journal')
  }
  {
    const x = deps({ journal: false })
    const r = await lib.marquerDemandeTraitee(requete({ id: ID }), x.d)
    if (r.statut !== 503 || x.client.chaines.length) e.push('journal indisponible : le geste a eu lieu quand même')
  }
  {
    const x = deps({ garde: fondateur('lecture') })
    const r = await lib.marquerDemandeTraitee(requete({ id: ID }), x.d)
    if (r.statut !== 403 || x.client.chaines.length) e.push('geste « traitée » permis au rôle lecture')
  }
  for (const corps of [{ id: 'x' }, {}, { id: `${ID}' or 1=1` }, null]) {
    const x = deps()
    const r = await lib.marquerDemandeTraitee(requete(corps), x.d)
    if (r.statut !== 400 || x.client.chaines.length || x.trace.journal.length) e.push(`identifiant invalide accepté : ${JSON.stringify(corps)}`)
  }
  {
    const x = deps({ reponses: [{ data: [], error: null }, { data: [{ id: ID, etat: 'traitee' }], error: null }] })
    const r = await lib.marquerDemandeTraitee(requete({ id: ID }), x.d)
    if (r.statut !== 200 || r.corps.deja !== true) e.push('demande déjà traitée : le rejeu devrait répondre 200 sans effet')
    const y = deps({ reponses: [{ data: [], error: null }, { data: [], error: null }] })
    const s = await lib.marquerDemandeTraitee(requete({ id: ID }), y.d)
    if (s.statut !== 404) e.push('demande inconnue : 404 attendu')
    const z = deps({ reponses: ['jette'] })
    const t = await lib.marquerDemandeTraitee(requete({ id: ID }), z.d)
    if (t.statut !== 503) e.push('base muette au geste : 503 attendu')
  }
  // L'écriture de /api/contact : une ligne, rien d'autre ; une base muette rend faux sans jeter.
  {
    const c = fauxClient([{ data: null, error: null }])
    const ok = await lib.enregistrerDemandeDemo(c, { motif: 'entreprise', taille: '1', activite: 'Autre', prenom: 'P', email: 'p@exemple.invalid', message: null })
    if (ok !== true || !egal(c.chaines[0], [['from', 'demandes_demo'], ['insert', { motif: 'entreprise', taille: '1', activite: 'Autre', prenom: 'P', email: 'p@exemple.invalid', message: null }], ['abortSignal', 'signal']])) e.push('écriture de /api/contact inattendue')
    for (const rep of [{ data: null, error: { message: 'x' } }, 'jette']) {
      const ko = await lib.enregistrerDemandeDemo(fauxClient([rep]), { motif: 'entreprise', taille: '1', activite: 'Autre', prenom: 'P', email: 'p@exemple.invalid', message: null }).catch(() => 'jette')
      if (ko !== false) e.push('écriture en panne : enregistrerDemandeDemo doit rendre faux sans jeter')
    }
  }
}

// ─── A, C, E, F. Les fichiers ─────────────────────────────────────────────────────────────────────────────────────────────────
function jugerFichiers(c, e) {
  if (!/^\s*demandesDemo:\s*false,/m.test(c.flags)) e.push('drapeau demandesDemo levé ou absent dans lib/flags.ts')
  // C. Les routes ne sont que des branchements.
  const r = sansJs(c.route)
  for (const m of ["traiterContact({", "drapeau: actif('demandesDemo')", 'enregistrerDemandeDemo(supabaseAdmin, ligne)', "export const runtime = 'nodejs'", 'export const maxDuration = 20',
    'banni: isBanned', 'abus: recordAbuse', 'limite: consommerLimiteStricte', 'notifier: notifierEntreprise', 'ip: () => getIp(req)', 'corps: () => req.json()', 'NextResponse.json(r.corps, { status: r.statut })']) {
    if (!r.includes(m)) e.push(`route /api/contact : « ${m} » manque`)
  }
  if (/\.from\(|insert\(|clip\(|EMAIL\.test/.test(r)) e.push('route /api/contact : de la logique hors de lib/demandesDemo.ts')
  const p = sansJs(c.poste)
  for (const m of ["drapeau: actif('demandesDemo')", 'estFondateur, estDirection, exigerDomaine, journaliser', 'client: supabaseAdmin', 'listeDemandesDemo(req, deps())', 'marquerDemandeTraitee(req, deps())', "'cache-control': 'no-store'"]) {
    if (!p.includes(m)) e.push(`route du Poste : « ${m} » manque`)
  }
  if (!/from '@\/lib\/direction\/garde'/.test(p)) e.push('route du Poste : la garde du fondateur n’est pas celle de lib/direction/garde')
  // E. L'écran.
  const pg = sansJs(c.page)
  if (!pg.includes("...(actif('demandesDemo') ? (['demos'] as const) : [])")) e.push('écran : l’onglet Démos n’est pas derrière le drapeau')
  if (!pg.includes("onglet === 'demos' ? <DemandesDemo role={role} signaler={signaler} />")) e.push('écran : l’onglet Démos ne rend pas DemandesDemo')
  if ((pg.match(/'demos'/g) ?? []).length < 3) e.push('écran : onglet Démos incomplet (type, rail, titre)')
  const ec = sansJs(c.ecran)
  if (!ec.includes("'/api/controle/demandes-demo'")) e.push('écran : il n’appelle pas la route protégée')
  if (/dangerouslySetInnerHTML|innerHTML/.test(ec)) e.push('écran : du HTML injecté')
  if (/fetch\(/.test(ec)) e.push('écran : un appel hors apiDirection (sans jeton)')
  const liens = [...ec.matchAll(/href=\{`mailto:\$\{d\.email\}`\}/g)].length
  if (liens !== 1 || !ec.includes('EMAIL_LIEN.test(d.email) ? <a href={`mailto:${d.email}`}>')) e.push('écran : lien mailto sans la garde EMAIL_LIEN')
  if (/href=\{[^}]*\b(message|prenom)\b/.test(ec)) e.push('écran : un lien construit sur un texte du demandeur')
  // F. La migration.
  const m = c.migration, mc = sansCommentaires(m)
  if (!/NON APPLIQUÉE, préparée le 02\/11, attend le go écrit de Benj/.test(m)) e.push('migration : l’en-tête « NON APPLIQUÉE » manque')
  if (!/Retour arrière[\s\S]{0,200}drop table if exists public\.demandes_demo/.test(m)) e.push('migration : retour arrière absent')
  if (!/alter table public\.demandes_demo enable row level security;/.test(mc)) e.push('migration : RLS non activée')
  if (!/revoke all on table public\.demandes_demo from public, anon, authenticated;/.test(mc)) e.push('migration : droits de anon/authenticated non retirés')
  for (const g of ['garde_session', 'garde_suspension_ins', 'garde_suspension_maj', 'garde_suspension_sup']) {
    if (!new RegExp(`create policy ${g} on public\\.demandes_demo as restrictive`).test(mc)) e.push(`migration : garde ${g} absente ou non restrictive`)
  }
  for (const pol of mc.matchAll(/create policy (\w+) on public\.demandes_demo([^;]*)/g)) {
    if (!/as restrictive/.test(pol[2]) && !/to n8n_lecture/.test(pol[2])) e.push(`migration : politique permissive ${pol[1]} hors n8n_lecture`)
  }
  if (/\bgrant\b[^;]*\b(anon|authenticated)\b/i.test(mc)) e.push('migration : un droit accordé à anon ou authenticated')
  const liste = (col) => { const x = new RegExp(`${col}\\s+text not null[^\\n]*check \\(${col} in \\(([^)]*)\\)\\)`).exec(mc); return x ? x[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')) : null }
  if (!egal(liste('taille'), TAILLES)) e.push('migration : liste des tailles différente du code')
  if (!egal(liste('activite'), ACTIVITES)) e.push('migration : liste des activités différente du code')
  if (!/etat\s+text not null default 'nouvelle' check \(etat in \('nouvelle', 'traitee'\)\)/.test(mc)) e.push('migration : états inattendus')
  if (!/motif\s+text not null default 'entreprise' check \(motif in \('entreprise'\)\)/.test(mc)) e.push('migration : motif hors liste fermée')
  if (/^\s*(ip|adresse_ip|ip_\w+|empreinte\w*|user_agent|agent)\s+(text|inet|cidr|varchar|jsonb|bytea)/im.test(mc)) e.push('migration : une IP ou une empreinte rangée')
  const grantN8n = /grant select \(([^)]*)\) on public\.demandes_demo to n8n_lecture/.exec(mc)
  if (!grantN8n) e.push('migration : la lecture de n8n n’est pas bornée par colonnes')
  else if (grantN8n[1].split(',').map((s) => s.trim()).some((x) => COORDONNEES.includes(x))) e.push('migration : n8n lirait une coordonnée')
  if (/\bconstant\b/i.test(mc)) e.push('migration : mot-clé CONSTANT (refusé par l’éditeur SQL)')
  // Le jumeau : même SQL, au bloc de contrôle près.
  const jn = sansCommentaires(c.jumeau.split('-- CONTROLE APRES COLLAGE')[0]).replace(/\s+/g, ' ').trim()
  if (jn !== mc.replace(/\s+/g, ' ').trim()) e.push('jumeau : son SQL diffère de la migration')
  const controle = c.jumeau.split('-- CONTROLE APRES COLLAGE')[1] ?? ''
  if (/\b(insert|update|delete|drop|alter|create|grant|revoke|truncate)\b/i.test(controle.replace(/^[^\n]*\n/, ''))) e.push('jumeau : le bloc de contrôle modifie la base')
}
const sansJs = (s) => s.replace(/\r/g, '')

// ─── G. L'export n8n ──────────────────────────────────────────────────────────────────────────────────────────────────────────
const WORKFLOW_ID = '4R2wS9374GUxb63F'
const URL_TABLE = 'https://gorcdvmueakcncsmrouo.supabase.co/rest/v1/demandes_demo'
const SUPABASE = { supabaseApi: { id: 'dTewDK98MLrNckNG', name: 'Supabase account' } }
const SLACK = { slackApi: { id: 'lR0GZ7FGXI3FCAF8', name: 'Slack account 2' } }
const CHAINE = ['Toutes les 15 minutes', 'Fenêtres du passage', 'Lire demandes neuves', 'Lire demandes à relancer', 'Avis à Benj', 'Prévenir Benj (#presti-auto)']
const TYPES = { 'Toutes les 15 minutes': 'n8n-nodes-base.scheduleTrigger', 'Fenêtres du passage': 'n8n-nodes-base.code', 'Lire demandes neuves': 'n8n-nodes-base.httpRequest',
  'Lire demandes à relancer': 'n8n-nodes-base.httpRequest', 'Avis à Benj': 'n8n-nodes-base.code', 'Prévenir Benj (#presti-auto)': 'n8n-nodes-base.slack' }
const EMPREINTES = {
  'Fenêtres du passage': 'e3150a582ef65bd5a0a175632b31188138a512292dfb12ef5a6aa4543f3db006',
  'Avis à Benj': '579f159cf8052ac29d4737f3d6e7cfae07cc7a506007306e9ce44416d1eaa260',
}
const lecture = (debut, fin, etat) => ({
  method: 'GET', url: URL_TABLE, authentication: 'predefinedCredentialType', nodeCredentialType: 'supabaseApi', sendQuery: true, specifyQuery: 'keypair',
  queryParameters: { parameters: [
    { name: 'select', value: 'id,taille,activite,etat,cree_le' }, { name: 'motif', value: 'eq.entreprise' },
    ...(etat ? [{ name: 'etat', value: 'eq.nouvelle' }] : []),
    { name: 'and', value: `={{ '(cree_le.gte.' + $('Fenêtres du passage').first().json.${debut} + ',cree_le.lt.' + $('Fenêtres du passage').first().json.${fin} + ')' }}` },
    { name: 'order', value: 'cree_le.asc,id.asc' }, { name: 'limit', value: '200' }] },
  options: { timeout: 30000 },
})
const GABARITS = {
  'Toutes les 15 minutes': { parameters: { rule: { interval: [{ field: 'cronExpression', expression: '0 */15 * * * *' }] } } },
  'Lire demandes neuves': { parameters: lecture('avis_debut', 'avis_fin', false), executeOnce: true, alwaysOutputData: true, credentials: SUPABASE },
  'Lire demandes à relancer': { parameters: lecture('relance_debut', 'relance_fin', true), executeOnce: true, alwaysOutputData: true, credentials: SUPABASE },
  'Prévenir Benj (#presti-auto)': { parameters: { resource: 'message', operation: 'post', authentication: 'accessToken', select: 'channel',
    channelId: { __rl: true, mode: 'name', value: 'presti-auto' }, messageType: 'text', text: '={{ $json.texte }}', otherOptions: { includeLinkToWorkflow: false } }, credentials: SLACK },
}
const CLES_PERMISES = new Set(['id', 'name', 'type', 'typeVersion', 'position', 'parameters', 'credentials', 'executeOnce', 'alwaysOutputData', 'webhookId'])
// 032-033 (audit 032-029, « Ce qu'il faut pour publier en simulation ») : la liste blanche s'ouvre à ces seules clés et valeurs — le
// workflow d'erreur commun presti-erreurs (AQeHiC58UgbMR4Kr), les échecs gardés (durée : la purge de l'instance, à régler par Benj).
const PRESTI_ERREURS = 'AQeHiC58UgbMR4Kr'
const REGLAGES = { executionOrder: 'v1', availableInMCP: true, timezone: 'Europe/Paris', saveDataSuccessExecution: 'none', saveDataErrorExecution: 'all', errorWorkflow: PRESTI_ERREURS }
const SECRETS = [/sk_live_[A-Za-z0-9]{8,}/, /sk-ant-[A-Za-z0-9_-]{8,}/, /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, /xox[abpr]-[A-Za-z0-9-]{8,}/, /service_role/i, /apikey/i, /Bearer\s+[A-Za-z0-9]/]

function jugerExport(wf, e, avecEmpreintes = true) {
  if (wf.id !== WORKFLOW_ID) e.push(`export : identifiant ${wf.id} au lieu de ${WORKFLOW_ID}`)
  if (wf.active !== false || wf.activeVersionId !== null || (wf.activeVersion !== null && wf.activeVersion !== undefined) || wf.triggerCount !== 0) e.push('export : workflow actif ou publié')
  if (wf.name !== 'presti-demande-demo') e.push('export : nom inattendu')
  if (!egal(wf.settings, REGLAGES)) e.push(`export : réglages hors liste blanche ${JSON.stringify(wf.settings)}`)
  const noms = wf.nodes.map((n) => n.name)
  if (!egal([...noms].sort(), [...CHAINE].sort())) e.push(`export : nœuds inattendus ${noms.join(', ')}`)
  for (const n of wf.nodes) {
    if (TYPES[n.name] !== n.type) e.push(`export : type inattendu pour ${n.name} (${n.type})`)
    for (const k of Object.keys(n)) if (!CLES_PERMISES.has(k)) e.push(`export : clé ${k} sur ${n.name}`)
    if (n.disabled) e.push(`export : nœud désactivé ${n.name}`)
    const g = GABARITS[n.name]
    if (g) for (const [k, v] of Object.entries(g)) if (!egal(n[k], v)) e.push(`export : ${n.name}.${k} diffère du gabarit`)
    if (n.type === 'n8n-nodes-base.code') {
      if (n.parameters.mode !== 'runOnceForAllItems' || n.parameters.language !== 'javaScript' || Object.keys(n.parameters).length !== 3) e.push(`export : réglages du code ${n.name}`)
      if (n.credentials) e.push(`export : identifiant sur un nœud Code ${n.name}`)
      if (avecEmpreintes && sha256(n.parameters.jsCode) !== EMPREINTES[n.name]) e.push(`export : code de « ${n.name} » changé — nouvel audit requis`)
      if (/\b(fetch|require|process|\$http|helpers|getWorkflowStaticData|\$env|\$vars)\b/.test(n.parameters.jsCode)) e.push(`export : ${n.name} sort de son rôle (réseau, mémoire ou environnement)`)
    }
    if (n.type === 'n8n-nodes-base.httpRequest') {
      const sel = n.parameters?.queryParameters?.parameters?.find((p) => p.name === 'select')?.value ?? ''
      if (sel.split(',').some((c) => COORDONNEES.includes(c.trim()))) e.push(`export : ${n.name} lit une coordonnée`)
      if ((n.parameters.method ?? 'GET') !== 'GET') e.push(`export : ${n.name} n’est pas une lecture`)
    }
  }
  // Un seul nœud qui sort quelque chose : Slack, vers #presti-auto (Benj), jamais vers le demandeur.
  const sortants = wf.nodes.filter((n) => !['n8n-nodes-base.scheduleTrigger', 'n8n-nodes-base.code', 'n8n-nodes-base.httpRequest'].includes(n.type))
  if (sortants.length !== 1 || sortants[0].type !== 'n8n-nodes-base.slack') e.push('export : un nœud d’envoi autre que l’avis Slack à Benj')
  // La chaîne exacte.
  for (let i = 0; i < CHAINE.length; i++) {
    const sorties = wf.connections[CHAINE[i]]?.main ?? []
    const attendu = i < CHAINE.length - 1 ? [[{ node: CHAINE[i + 1], type: 'main', index: 0 }]] : []
    if (!egal(sorties, attendu)) e.push(`export : connexion inattendue après « ${CHAINE[i]} »`)
  }
  if (Object.keys(wf.connections).length !== CHAINE.length - 1) e.push('export : connexions en trop')
  const tout = JSON.stringify(wf)
  for (const re of SECRETS) if (re.test(tout)) e.push(`export : secret possible (${re.source.slice(0, 24)})`)
}

// ─── H. Le rejeu du code des nœuds ────────────────────────────────────────────────────────────────────────────────────────────
function executer(code, $input, $) {
  const ctx = vm.createContext({ $input, $, Date, Math, JSON, Set, Number, String, Array, Object, Error, RegExp })
  const f = vm.runInContext(`(function () {\n${code}\n})`, ctx, { timeout: 2000 })
  return JSON.parse(JSON.stringify(f()))
}
const element = (items) => ({ first: () => items[0], all: () => items })
function passage(wf, timestamp, neuves, relancer) {
  const code = (nom) => wf.nodes.find((n) => n.name === nom).parameters.jsCode
  const fen = executer(code('Fenêtres du passage'), element([{ json: { timestamp } }]), () => { throw new Error('$ inattendu') })
  const sources = { 'Fenêtres du passage': fen, 'Lire demandes neuves': neuves.map((j) => ({ json: j })), 'Lire demandes à relancer': relancer.map((j) => ({ json: j })) }
  const avis = executer(code('Avis à Benj'), element([]), (nom) => { if (!sources[nom]) throw new Error(`nœud inconnu ${nom}`); return element(sources[nom]) })
  return { fenetres: fen[0]?.json, avis: avis.map((x) => x.json) }
}

function jugerRejeu(wf, essai, e) {
  // H1. L'essai de n8n, rendu à l'identique.
  const p = essai.pinData
  const r = passage(wf, p['Toutes les 15 minutes'][0].json.timestamp, p['Lire demandes neuves'].map((x) => x.json), p['Lire demandes à relancer'].map((x) => x.json))
  if (!egal(r.fenetres, essai.sortie['Fenêtres du passage'][0])) e.push('rejeu : fenêtres différentes de celles de n8n')
  if (!egal(r.avis, essai.sortie['Avis à Benj'])) e.push('rejeu : avis différents de ceux de n8n')
  if (essai.status !== 'success' || essai.workflowId !== WORKFLOW_ID) e.push('essai n8n : pas un succès de ce workflow')
  for (const nom of ['Toutes les 15 minutes', 'Lire demandes neuves', 'Lire demandes à relancer', 'Prévenir Benj (#presti-auto)']) if (!p[nom]) e.push(`essai n8n : ${nom} non épinglé (un envoi réel aurait pu partir)`)
  // H2. Trois jours de passages, demandes et gestes tirés au hasard (graine fixe). PostgREST simulé : filtre de la requête appliqué
  // tel que l'export l'écrit (fenêtre, motif, état AU MOMENT du passage). Des coordonnées sont rendues par la « base » : elles ne
  // doivent jamais ressortir.
  const h = lcg(19), debut = Date.parse('2026-11-01T00:00:00Z'), PAS = 15 * 60 * 1000
  const demandes = Array.from({ length: 120 }, (_, i) => {
    const cree = debut + Math.floor(h() * 2 * 86400e3)
    const traitee = h() < 0.5 ? cree + Math.floor(h() * 4 * 86400e3) : null
    return { id: `${String(i).padStart(8, '0')}-0000-4000-8000-${String(i).padStart(12, '0')}`, taille: TAILLES[i % 4], activite: ACTIVITES[(i >> 2) % 4], cree,
      traitee, prenom: `Prénom-${i}`, email: `d${i}@exemple.invalid`, message: `message ${i}` }
  })
  const recus = new Map()
  for (let slot = debut; slot < debut + 4.5 * 86400e3; slot += PAS) {
    const t = slot + Math.floor(h() * 50e3) // le passage part quelques secondes après l'heure
    const fen = passage(wf, new Date(t).toISOString(), [], []).fenetres
    const vue = (d) => ({ id: d.id, taille: d.taille, activite: d.activite, etat: d.traitee !== null && d.traitee <= t ? 'traitee' : 'nouvelle',
      cree_le: new Date(d.cree).toISOString(), prenom: d.prenom, email: d.email, message: d.message })
    const dans = (d, a, b) => d.cree >= Date.parse(a) && d.cree < Date.parse(b) && d.cree <= t - 60e3 // visible une minute après l'écriture
    const neuves = demandes.filter((d) => dans(d, fen.avis_debut, fen.avis_fin)).map(vue)
    // Une lecture qui rend deux fois la même ligne (une page relue, un rejeu) ne doit jamais prévenir deux fois.
    if (neuves.length && h() < 0.5) neuves.push({ ...neuves[0] })
    const relancer = demandes.filter((d) => dans(d, fen.relance_debut, fen.relance_fin)).map(vue).filter((v) => v.etat === 'nouvelle')
    if (relancer.length && h() < 0.5) relancer.push({ ...relancer[0] })
    const { avis } = passage(wf, new Date(t).toISOString(), neuves, relancer)
    for (const a of avis) {
      const k = `${a.demande_id}:${a.type}`
      recus.set(k, [...(recus.get(k) ?? []), t])
      if (COORDONNEES.some((c) => c in a) || /exemple\.invalid|Prénom-|message \d/.test(a.texte)) e.push('rejeu : une coordonnée dans un avis')
      if (!a.texte.includes('https://qg.prestiapp.fr/controle?onglet=demos')) e.push('rejeu : avis sans lien vers le Poste')
    }
  }
  for (const d of demandes) {
    const avis = recus.get(`${d.id}:avis`) ?? [], rel = recus.get(`${d.id}:relance_j2`) ?? []
    if (avis.length !== 1) { e.push(`rejeu : demande ${d.id} prévenue ${avis.length} fois`); break }
    const attendueRelance = Math.floor((d.cree + 48 * 3600e3 + 5 * 60e3) / PAS) * PAS + PAS // le passage dont la fenêtre de J−2 contient la demande
    const tRel = rel[0]
    const doitRelancer = d.traitee === null || d.traitee > attendueRelance + 50e3
    if (doitRelancer && rel.length !== 1) { e.push(`rejeu : demande non traitée ${d.id} relancée ${rel.length} fois`); break }
    if (!doitRelancer && d.traitee < attendueRelance && rel.length !== 0) { e.push(`rejeu : demande traitée ${d.id} relancée quand même`); break }
    if (rel.length === 1 && (tRel < d.cree + 48 * 3600e3 || tRel > d.cree + 48 * 3600e3 + 25 * 60e3)) { e.push(`rejeu : relance de ${d.id} hors de J+2`); break }
  }
  return demandes.length
}

// ─── Le juge ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function juger(c, { avecEmpreintes = true } = {}) {
  const e = []
  jugerFichiers(c, e)
  try {
    await jugerContact(c.lib, e)
    await jugerPoste(c.lib, e)
  } catch (x) { e.push(`lib/demandesDemo.ts a jeté : ${x instanceof Error ? x.message : x}`) }
  jugerExport(c.wf, e, avecEmpreintes)
  try { jugerRejeu(c.wf, c.essai, e) } catch (x) { e.push(`rejeu impossible : ${x instanceof Error ? x.message : x}`) }
  if (!c.brief.includes(WORKFLOW_ID) || !/inactif, jamais publié/.test(c.brief)) e.push('brief : identifiant du workflow ou « inactif » absent')
  return e
}

const TMP = mkdtempSync(path.join(tmpdir(), 'demandes-demo-qa-'))
let nMutant = 0
async function chargerLib(source) {
  const f = path.join(TMP, `lib-${nMutant++}.ts`)
  writeFileSync(f, source)
  return import(pathToFileURL(f).href)
}
const remplacer = (cible, avant, apres) => { if (!cible.includes(avant)) throw new Error(`mutant sans effet : « ${avant.slice(0, 70)} » introuvable`); return cible.split(avant).join(apres) }

const BASE = {
  libSrc: lire(CHEMINS.lib), flags: lire(CHEMINS.flags), route: lire(CHEMINS.route), poste: lire(CHEMINS.poste), page: lire(CHEMINS.page), ecran: lire(CHEMINS.ecran),
  migration: lire(CHEMINS.migration), jumeau: lire(CHEMINS.jumeau), brief: lire(CHEMINS.brief), wf: JSON.parse(lire(CHEMINS.export)), essai: JSON.parse(lire(CHEMINS.essai)),
}
const noeud = (wf, nom) => wf.nodes.find((n) => n.name === nom)
const libMut = (avant, apres) => ({ lib: [avant, apres] })
// Un mutant du SQL touche la migration ET son jumeau : il doit rougir pour sa raison, pas parce que le jumeau a divergé.
const migMut = (avant, apres) => ({ f: (c) => { c.migration = remplacer(c.migration, avant, apres); c.jumeau = remplacer(c.jumeau, avant, apres) } })
const codeMut = (nom, avant, apres) => ({ f: (c) => { const n = noeud(c.wf, nom); n.parameters.jsCode = remplacer(n.parameters.jsCode, avant, apres) }, sansEmpreintes: true })
const MUTANTS = [
  { nom: 'drapeau ignoré (toujours levé)', ...libMut('if (d.drapeau) {', 'if (true) {') },
  { nom: 'écriture en panne : l’e-mail ne part plus', ...libMut("if (!rangee) console.error('[contact] demande de démo non rangée en base : l’e-mail part quand même')", "if (!rangee) return rep(502, { error: 'x' })") },
  { nom: 'e-mail en panne : 502 même si la demande est rangée', ...libMut('if (!r.ok && !rangee) return', 'if (!r.ok) return') },
  { nom: 'taille hors liste acceptée', ...libMut("if (!dans(TAILLES, taille)) return { ok: false, error: 'Choisissez la taille de votre équipe.', code: 'taille' }", '') },
  { nom: 'motif hors liste rangé', ...libMut("if (!dans(MOTIFS, motif)) return { ok: false, error: 'Ce motif de demande n’existe pas.', code: 'motif' }", '') },
  { nom: 'hors liste : demande perdue (400)', ...libMut("if (!m.ok) console.error(`[contact] demande de démo hors liste (${m.code}) : non rangée, l’e-mail part quand même`)", 'if (!m.ok) return rep(400, { error: m.error })') },
  { nom: 'moitié de caractère rangée', ...libMut("const propre = (t: string) => t.replace(SURROGAT_SEUL, '')", 'const propre = (t: string) => t') },
  { nom: 'lien mailto non gardé (garde)', ...libMut(`export const EMAIL_LIEN = /^[^\\s@?&%#/:<>"']+@[^\\s@?&%#/:<>"']+\\.[^\\s@?&%#/:<>"']{2,}$/`, 'export const EMAIL_LIEN = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/') },
  { nom: 'lien mailto non gardé (écran)', f: (c) => { c.ecran = remplacer(c.ecran, 'EMAIL_LIEN.test(d.email) ? ', 'true ? ') } },
  { nom: 'Poste : neuves non mises en tête', ...libMut(".order('etat', { ascending: true })", '') },
  { nom: 'activité élargie', ...libMut("'Architecte', 'Autre'] as const", "'Architecte', 'Autre', 'Plombier'] as const") },
  { nom: 'double écriture', ...libMut('    let rangee = false\n', '    let rangee = false\n    if (demo) await d.enregistrer(demo)\n') },
  { nom: 'message d’e-mail changé', ...libMut('(envoyé depuis le formulaire de contact de prestiapp.fr)', '(formulaire de contact)') },
  { nom: 'coordonnée au journal', ...libMut("console.error('[contact] demande de démo non rangée en base : l’e-mail part quand même')", "console.error('[contact] non rangée :', demo.email)") },
  { nom: 'en-tête composé non retiré', ...libMut('if (message === entete) return null', 'if (message === entete) return message') },
  { nom: 'Poste ouvert drapeau baissé', ...libMut('if (!d.drapeau) return INTROUVABLE', '') },
  { nom: 'Poste ouvert au partenaire', ...libMut("if (dom.borne || f.roleInterne !== 'fondateur') return", 'if (false) return') },
  { nom: 'geste non conditionnel', ...libMut(".eq('id', id).eq('etat', 'nouvelle')", ".eq('id', id)") },
  { nom: 'geste sans journal', ...libMut('if (!journalOk) return', 'if (false) return') },
  { nom: 'geste permis au rôle lecture', ...libMut("verbe === 'ecrire' ? await d.estDirection(req) : await d.estFondateur(req)", 'await d.estFondateur(req)') },
  { nom: 'identifiant non vérifié', ...libMut("if (!estUuid(id)) return rep(400, { error: 'Demande inconnue.', code: 'id' })", '') },
  { nom: 'ligne hors liste affichée', ...libMut('|| !dans(TAILLES, taille) ', '') },
  { nom: 'drapeau levé dans lib/flags.ts', f: (c) => { c.flags = remplacer(c.flags, '  demandesDemo: false,', '  demandesDemo: true,') } },
  { nom: 'route : drapeau en dur', f: (c) => { c.route = remplacer(c.route, "drapeau: actif('demandesDemo')", 'drapeau: true') } },
  { nom: 'route du Poste sans garde', f: (c) => { c.poste = remplacer(c.poste, 'estFondateur, estDirection, exigerDomaine, journaliser', 'estFondateur: async () => ({}), estDirection, exigerDomaine, journaliser') } },
  { nom: 'onglet hors drapeau', f: (c) => { c.page = remplacer(c.page, "...(actif('demandesDemo') ? (['demos'] as const) : [])", "'demos' as const") } },
  { nom: 'écran : HTML injecté', f: (c) => { c.ecran = remplacer(c.ecran, '{d.message}</small>', '<span dangerouslySetInnerHTML={{ __html: d.message }} /></small>') } },
  { nom: 'migration sans RLS', ...migMut('alter table public.demandes_demo enable row level security;', '') },
  { nom: 'migration : anon garde ses droits', ...migMut('on table public.demandes_demo from public, anon, authenticated;', 'on table public.demandes_demo from public;') },
  { nom: 'migration : politique ouverte', ...migMut('do $lecture$', 'create policy tout on public.demandes_demo for select to authenticated using (true);\ndo $lecture$') },
  { nom: 'migration : n8n lit l’e-mail', ...migMut('grant select (id, motif,', 'grant select (id, email, motif,') },
  { nom: 'migration : taille élargie', ...migMut("'6 à 20', 'plus de 20')", "'6 à 20', 'plus de 20', '100')") },
  { nom: 'migration : IP rangée', ...migMut('  cree_le          timestamptz', '  ip               text,\n  cree_le          timestamptz') },
  { nom: 'migration sans en-tête', f: (c) => { c.migration = remplacer(c.migration, 'NON APPLIQUÉE', 'APPLIQUÉE') } },
  { nom: 'jumeau désynchronisé', f: (c) => { c.jumeau = remplacer(c.jumeau, "'nouvelle', 'traitee'", "'nouvelle', 'traitee', 'perdue'") } },
  { nom: 'workflow actif', f: (c) => { c.wf.active = true } },
  { nom: 'workflow publié', f: (c) => { c.wf.activeVersionId = c.wf.versionId } },
  { nom: 'lecture du prénom', f: (c) => { noeud(c.wf, 'Lire demandes neuves').parameters.queryParameters.parameters[0].value = 'id,taille,activite,etat,cree_le,prenom' } },
  { nom: 'lecture en POST', f: (c) => { noeud(c.wf, 'Lire demandes à relancer').parameters.method = 'POST' } },
  { nom: 'relance sans filtre d’état', f: (c) => { const p = noeud(c.wf, 'Lire demandes à relancer').parameters.queryParameters.parameters; p.splice(p.findIndex((x) => x.name === 'etat'), 1) } },
  { nom: 'Slack vers un autre canal', f: (c) => { noeud(c.wf, 'Prévenir Benj (#presti-auto)').parameters.channelId.value = 'general' } },
  { nom: 'envoi au demandeur ajouté', f: (c) => { c.wf.nodes.push({ id: 'x', name: 'E-mail au demandeur', type: 'n8n-nodes-base.emailSend', typeVersion: 2.1, position: [0, 0], parameters: {} }) } },
  { nom: 'succès gardés dans n8n', f: (c) => { c.wf.settings.saveDataSuccessExecution = 'all' } },
  { nom: 'échecs non gardés (032-033)', f: (c) => { c.wf.settings.saveDataErrorExecution = 'none' } },
  { nom: 'workflow d’erreur retiré (032-033)', f: (c) => { delete c.wf.settings.errorWorkflow } },
  { nom: 'workflow d’erreur vers un autre workflow (032-033)', f: (c) => { c.wf.settings.errorWorkflow = 'AutreWorkflow01' } },
  { nom: 'faux secret dans l’export', f: (c) => { noeud(c.wf, 'Prévenir Benj (#presti-auto)').parameters.text += ' ' + 'xox' + 'b-' + '1'.repeat(20) } },
  { nom: 'code changé (empreinte)', f: (c) => { noeud(c.wf, 'Avis à Benj').parameters.jsCode += '\n// retouche' } },
  { nom: 'fenêtres qui se chevauchent', ...codeMut('Fenêtres du passage', 'const debut = fin - PAS;', 'const debut = fin - 2 * PAS;') },
  { nom: 'fenêtres avec un trou', ...codeMut('Fenêtres du passage', 'const debut = fin - PAS;', 'const debut = fin - PAS + 60000;') },
  { nom: 'relance à J+1', ...codeMut('Fenêtres du passage', 'const J2 = 48 * 60 * 60 * 1000;', 'const J2 = 24 * 60 * 60 * 1000;') },
  { nom: 'relance d’une demande traitée', ...codeMut('Avis à Benj', "if (!d || d.etat !== 'nouvelle' || !dans", 'if (!d || !dans') },
  { nom: 'avis hors fenêtre', ...codeMut('Avis à Benj', 'if (!d || !dans(d.cree_le, f.avis_debut, f.avis_fin)) continue;', 'if (!d) continue;') },
  { nom: 'coordonnées recopiées dans l’avis', f: (c) => { const n = noeud(c.wf, 'Avis à Benj'); n.parameters.jsCode = remplacer(remplacer(n.parameters.jsCode, '{ id: j.id, taille: j.taille,', '{ ...j, id: j.id, taille: j.taille,'), 'avis.push({ cle,', 'avis.push({ ...d, cle,') }, sansEmpreintes: true },
  { nom: 'doublon d’avis', ...codeMut('Avis à Benj', '  if (vus.has(cle)) return;\n', '') },
  { nom: 'essai non épinglé (Slack réel)', f: (c) => { delete c.essai.pinData['Prévenir Benj (#presti-auto)'] } },
]

async function main() {
  const lib = await chargerLib(BASE.libSrc)
  const depart = { ...copie({ ...BASE, lib: undefined }), lib }
  const erreurs = await juger(depart)
  const nCas = await jugerContact(lib, [])
  if (erreurs.length) {
    console.log(`ÉCHEC — ${erreurs.length} défaut(s) sur les fichiers réels :`)
    for (const x of erreurs) console.log('  ✗ ' + x)
  } else {
    console.log('  ✓ A. drapeau demandesDemo baissé (lib/flags.ts)')
    console.log(`  ✓ B. /api/contact : ${nCas} comparaisons à la route d'avant, drapeau baissé, à l'octet près ; levé : écriture + e-mail, panne d'écriture = e-mail quand même, hors liste = jamais rangé et jamais perdu`)
    console.log('  ✓ C. routes : branchements seulement (drapeau, garde du fondateur, clé de service)')
    console.log('  ✓ D. Poste : 404 baissé, refus de garde transmis, partenaire refusé, geste « traitée » journalisé et conditionnel')
    console.log('  ✓ E. écran : onglet Démos derrière le drapeau, route protégée, aucun HTML injecté')
    console.log('  ✓ F. migration 0190 non appliquée : RLS, droits retirés, gardes, listes fermées, sans IP ; jumeau identique')
    console.log('  ✓ G. export n8n inactif, jamais publié : lectures GET sans coordonnées, un seul avis Slack à Benj, aucun secret, empreintes')
    console.log('  ✓ H. rejeu : essai n8n rendu à l’identique ; 120 demandes sur 4,5 jours : un avis chacune, une relance J+2 si non traitée')
  }
  let tues = 0
  const survivants = []
  for (const m of MUTANTS) {
    const c = { ...copie({ ...BASE, lib: undefined }) }
    let source = BASE.libSrc
    try {
      if (m.lib) source = remplacer(source, m.lib[0], m.lib[1])
      if (m.f) m.f(c)
    } catch (x) { survivants.push(`${m.nom} (${x.message})`); continue }
    c.lib = m.lib ? await chargerLib(source) : lib
    const e = await juger(c, { avecEmpreintes: !m.sansEmpreintes })
    // QA_RAISONS=1 : la première raison de chaque mutant, pour vérifier qu'il rougit pour la bonne cause.
    if (process.env.QA_RAISONS) console.log(`    · ${m.nom} → ${e[0] ?? 'VERT'}`)
    if (e.length) tues++
    else survivants.push(m.nom)
  }
  console.log(`  ${survivants.length ? '✗' : '✓'} I. mutants : ${tues}/${MUTANTS.length} rouges`)
  for (const s of survivants) console.log('  ✗ mutant survivant : ' + s)
  rmSync(TMP, { recursive: true, force: true })
  const ok = !erreurs.length && !survivants.length
  console.log(ok ? '\n✅ demandes-demo-qa : vert' : '\n❌ demandes-demo-qa : rouge')
  process.exitCode = ok ? 0 : 1
}
await main()
