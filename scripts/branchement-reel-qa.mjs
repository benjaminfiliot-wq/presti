// Juge de la tâche 036-030 — le branchement réel des agents n8n de Studio et Signature (audit 036-029, gestes 2), écrit par Claude Code.
//
// Hors ligne : aucun réseau, aucune base, aucun appel au modèle. Il juge, sur les fichiers du dépôt et sur les exports n8n rapatriés
// (.orchestre/preuves/036-030/) :
//   E  l'écrivain des événements (lib/evenements/ecrivain.ts) et son branchement (app/api/leads/route.ts) : idempotent, sans texte libre,
//      jamais bloquant (client qui lève, qui rejette, qui répond en erreur, qui ne répond pas) ; la demande passe toujours ;
//   L  les lectures du Cerveau (export de presti-cerveau) : plus aucun emplacement vide, chaque lecture réelle filtrée par compte, le code de
//      chaque nœud Code égal octet pour octet à la source unique lib/agents/n8n/cerveau-reel.mjs, deux écritures seulement, aucun envoi ;
//   O  le palier « ombre », rejoué hors ligne sur le scénario fictif (scenario-ombre.mjs) ET relu sur l'exécution n8n rapatriée ;
//   C  les cartes : jamais sans source (côté n8n et côté écran), idempotentes, multi-tenant ; la migration 0194 et son jumeau ;
//   B  la boîte « À valider » et sa route : drapeau neuf baissé, rien dans le DOM, aucun envoi, Studio compris ;
//   S  l'entrée dans SUITES de scripts/tout-verifier.mjs.
// Puis il prouve qu'il peut rougir : chaque mutant de la tâche (et quelques autres) doit le faire échouer.
//   node scripts/branchement-reel-qa.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PREUVES = path.join(RACINE, '.orchestre/preuves/036-030')
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8')
const F = {
  ecrivain: 'lib/evenements/ecrivain.ts',
  leads: 'app/api/leads/route.ts',
  cerveau: 'lib/agents/n8n/cerveau-reel.mjs',
  cartes: 'lib/agents/n8n/cartes.ts',
  route: 'app/api/assistant/agents/route.ts',
  boite: 'app/crm/BoiteAgents.tsx',
  gestion: 'app/crm/Gestion.tsx',
  flags: 'lib/flags.ts',
  migration: 'supabase/migrations/0194_cartes_agents.sql',
  jumeau: 'supabase/migrations/_A_COLLER_sql_editor_0194_cartes_agents_NU.sql',
  lanceur: 'scripts/tout-verifier.mjs',
  export: '.orchestre/preuves/036-030/presti-cerveau.workflow.json',
  essais: '.orchestre/preuves/036-030/essais-n8n.json',
}

// ── Chargement d'un module (TypeScript retiré par Node 24, ou .mjs) depuis un TEXTE : les mutants passent par ici. ──────────────────
let compteur = 0
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'branchement-reel-'))
async function charger(texte, ext) {
  const f = path.join(TMP, `m${++compteur}${ext}`)
  fs.writeFileSync(f, texte)
  return import(pathToFileURL(f).href)
}

// ── Un moteur n8n minimal pour les nœuds Code (« runOnceForAllItems ») : $(nom).all(b) / first() / isExecuted, $input.all(). ──────
function executerCode(code, sorties, entree) {
  const $ = (nom) => {
    const s = sorties[nom]
    return {
      isExecuted: !!s,
      all: (b = 0) => (s ? (s[b] || []).map((json) => ({ json })) : []),
      first: () => (s && s[0] && s[0][0] !== undefined ? { json: s[0][0] } : { json: undefined }),
    }
  }
  const $input = { all: () => (entree || []).map((json) => ({ json })) }
  // eslint-disable-next-line no-new-func
  const r = new Function('$', '$input', code)($, $input)
  return (r || []).map((x) => x.json)
}

/** Rejoue le Cerveau sur le scénario de l'ombre : lectures et chefs épinglés, codes exécutés, écritures NON faites (comptées). */
function rejouerCerveau(C, PINS) {
  const pin = (n) => [(PINS[n] || []).map((x) => x.json)]
  const s = {}
  for (const n of ['Lire les interrupteurs généraux', 'Lire les réglages des départements', 'Lire les comptes et leurs offres', 'Lire les modes de réponse', 'Lire les événements non traités', 'Lire les demandes des événements']) s[n] = pin(n)
  s['Interrupteur général'] = [executerCode(C.CODES['Interrupteur général'], s, s['Lire les interrupteurs généraux'][0])]
  if (s['Interrupteur général'][0][0].interrupteur_general !== true) return { s, bilan: executerCode(C.CODES['Bilan du passage'], { 'Interrupteur général': s['Interrupteur général'] }, [])[0] }
  s['Composer les comptes'] = [executerCode(C.CODES['Composer les comptes'], s, [])]
  s['Composer les pages'] = [executerCode(C.CODES['Composer les pages'], s, [])]
  s['Aiguiller'] = [executerCode(C.CODES['Aiguiller'], s, s['Composer les pages'][0])]
  const env = s['Aiguiller'][0].filter((x) => x.contrat === 'presti-dep-accueil@1')
  if (env.length) s['Appeler presti-dep-accueil'] = [pin('Appeler presti-dep-accueil')[0], []]
  s['Journal : rejeté ou sauté'] = [s['Aiguiller'][0].filter((x) => x.contrat === 'aucun').map((x) => ({ contrat: 'aucun', rejets: x.rejets || [], sautes: x.sautes || [] }))]
  s['Préparer les cartes de l’ombre'] = [executerCode(C.CODES['Préparer les cartes de l’ombre'], s, [])]
  const lignes = s['Préparer les cartes de l’ombre'][0][0].lignes
  if (lignes.length) s['Écrire les cartes (ombre)'] = [[{ epingle: true }]]
  s['Préparer les marques'] = [executerCode(C.CODES['Préparer les marques'], s, [])]
  s['Appeler lib-battement'] = [[{ statut: 'ok', effets_prevus: [], effets_faits: [] }]]
  const bilan = executerCode(C.CODES['Bilan du passage'], s, [])[0]
  return { s, lignes, marques: s['Préparer les marques'][0].filter((x) => x.p_artisan), bilan, envs: env }
}

// ── Les règles ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function juger(T) {
  const fautes = []
  const ok = (cond, msg) => { if (!cond) fautes.push(msg) }

  // E — l'écrivain
  let E
  try { E = await charger(T.ecrivain, '.ts') } catch (e) { fautes.push('E0 écrivain illisible : ' + e.message); E = null }
  if (E) {
    const A = '00000000-0000-4000-8000-0000000000a1', L = '00000000-0000-4000-8000-a00000000001'
    const appels = []
    const client = (rep) => ({ from: (t) => ({ upsert: (ligne, opt) => { appels.push({ t, ligne, opt }); return rep() } }) })
    const ev = E.evenementDemandeRecue({ artisanId: A, leadId: L, canal: 'formulaire', urgence: 'urgent', aMessage: true, photos: 2 })
    ok(ev && ev.type === 'demande_recue' && ev.cle === 'demande_recue:' + L && ev.objet_type === 'lead' && ev.objet_id === L, 'E1 demande_recue : type, clé unique par demande, objet lead')
    ok(ev && Object.values(ev.faits).every((v) => v === null || ['number', 'boolean'].includes(typeof v) || /^([a-z][a-z0-9_:.-]{0,63}|[0-9a-f-]{36}|\d{4}-\d{2}-\d{2}.*)$/.test(v)), 'E2 faits sans texte libre')
    const ev2 = E.evenementDemandeRecue({ artisanId: A, leadId: L, canal: 'Jean Dupont', urgence: 'appelez-moi au 0612345678' })
    ok(ev2 && ev2.faits.canal === undefined && ev2.faits.urgence === undefined && ev2.cle === ev.cle, 'E3 un texte de client est RETIRÉ des faits ; même clé au rejeu')
    const r1 = await E.ecrireEvenement(client(() => Promise.resolve({ error: null })), ev)
    ok(r1.ok === true && appels[0]?.t === 'evenements_metier' && appels[0]?.opt?.onConflict === 'artisan_id,cle' && appels[0]?.opt?.ignoreDuplicates === true, 'E4 idempotent : upsert sur (artisan_id, cle), doublon ignoré')
    const essais = [
      ['client qui lève', () => { throw new Error('panne') }],
      ['client qui rejette', () => Promise.reject(new Error('réseau'))],
      ['base en erreur', () => Promise.resolve({ error: { message: 'relation "evenements_metier" does not exist' } })],
      ['base muette', () => new Promise(() => {})],
    ]
    for (const [nom, rep] of essais) {
      let leve = false, r = null
      const t0 = Date.now()
      let garde
      const bornee = new Promise((res) => { garde = setTimeout(() => res({ bloque: true }), 1500) })
      try { r = await Promise.race([E.ecrireEvenement(client(rep), ev, 200), bornee]) } catch { leve = true } finally { clearTimeout(garde) }
      if (r && r.bloque) r = null
      ok(!leve && r && r.ok === false && Date.now() - t0 < 2000, `E5 jamais bloquant (${nom}) : ni exception, ni attente`)
    }
    ok(E.evenementRelanceDue({ artisanId: A, leadId: L, rang: 2 })?.cle === 'relance_due:' + L + ':r2', 'E6 relance_due : une clé par demande et par rang')
    ok(E.construireEvenement({ artisanId: 'pas-un-uuid', type: 'demande_recue', objetType: null, objetId: null, cle: 'x:1' }) === null, 'E7 compte invalide = aucun événement')
  }
  const route = T.leads
  const i = route.indexOf('ecrireEvenement(supabaseAdmin, evenementDemandeRecue(')
  const bloc = i >= 0 ? route.slice(route.lastIndexOf('if (actif(', i), route.indexOf('\n    }\n', i) + 6) : ''
  ok(i > route.indexOf("from('leads')") && i < route.indexOf('if (!plateforme)'), 'E8 l’événement est rangé APRÈS l’enregistrement de la demande, avant les réponses')
  ok(/if \(actif\('systemeAgents'\)\)/.test(bloc), 'E9 écriture derrière le drapeau systemeAgents (baissé)')
  ok(bloc && !/return\b|throw\b/.test(bloc), 'E10 la demande passe quand l’écriture échoue : aucun return ni throw dans le bloc')

  // L — les lectures du Cerveau (export rapatrié) et la source unique
  let C
  try { C = await charger(T.cerveau, '.mjs') } catch (e) { fautes.push('L0 source du Cerveau illisible : ' + e.message); C = null }
  let w = null
  try { const x = JSON.parse(T.export); w = x.workflow || x } catch { fautes.push('L1 export de presti-cerveau absent ou illisible') }
  if (w && C) {
    const noeuds = w.nodes || []
    ok(!noeuds.some((n) => n.type === 'n8n-nodes-base.noOp'), 'L2 aucun emplacement vide (noOp) ne reste dans le Cerveau')
    ok(!noeuds.some((n) => /épinglé/.test(n.name)), 'L3 aucune lecture « (simulation : épinglé) » ne reste')
    for (const [nom, l] of Object.entries(C.LECTURES)) {
      const n = noeuds.find((x) => x.name === nom)
      const q = n?.parameters?.queryParameters?.parameters || []
      ok(n && n.type === 'n8n-nodes-base.httpRequest' && n.parameters.method === 'GET', `L4 ${nom} : lecture HTTP GET réelle`)
      ok(n && n.parameters.url === C.SUPABASE + '/rest/v1/' + l.table && n.credentials?.supabaseApi?.id === C.IDENTIFIANT.id, `L5 ${nom} : table ${l.table}, identifiant « Supabase account »`)
      ok(q.some((p) => p.name === 'select' && !/\*/.test(p.value)), `L6 ${nom} : select= limité`)
      ok(nom === 'Lire les interrupteurs généraux' ? q.some((p) => p.name === 'departement' && p.value === 'eq.tous') : q.some((p) => (p.name === 'artisan_id' || p.name === 'id') && /^=\{\{ 'in\.\(/.test(p.value)), `L7 ${nom} : filtrée par compte`)
      ok(n && n.onError === 'continueRegularOutput' && n.executeOnce === true, `L8 ${nom} : une fois par passage, une panne ne casse pas le Cerveau (fail-closed)`)
    }
    for (const [nom, code] of Object.entries(C.CODES)) {
      const n = noeuds.find((x) => x.name === nom)
      ok(n && n.parameters?.jsCode === code, `L9 ${nom} : code n8n = source unique, octet pour octet`)
    }
    const posts = noeuds.filter((n) => n.type === 'n8n-nodes-base.httpRequest' && n.parameters.method && n.parameters.method !== 'GET')
    ok(posts.length === 2 && posts.every((n) => C.ECRITURES[n.name] && n.parameters.url === C.ECRITURES[n.name].url), 'L10 deux écritures seulement : la carte (assistant_actions) et la marque « traité »')
    ok(!noeuds.some((n) => /emailSend|gmail|smtp|twilio|telegram|slack|whatsapp/i.test(n.type)), 'L11 aucun nœud d’envoi dans le Cerveau')
    ok(w.active === true && w.activeVersion?.sameAsDraft !== false, 'L12 le Cerveau publié est celui exporté (publié = brouillon)')
    ok(/palier === 'reel' \? 'palier_reel_non_branche'/.test(C.CODES['Aiguiller']) && /SERVIS = \['simulation', 'ombre'\]/.test(C.CODES['Aiguiller']), 'L13 palier « réel » jamais servi ; simulation et ombre seulement')
    ok(!/simulation: false/.test(C.CODES['Aiguiller']) && /simulation: true/.test(C.CODES['Aiguiller']), 'L14 porte de simulation fermée pour chaque enveloppe (ombre comprise)')
  }

  // O — le palier « ombre », hors ligne, puis l'exécution n8n relue
  if (C) {
    const S = await import(pathToFileURL(path.join(PREUVES, 'scenario-ombre.mjs')).href)
    let R = null
    try { R = rejouerCerveau(C, S.PINS) } catch (e) { fautes.push('O0 le Cerveau ne se rejoue pas : ' + e.message) }
    if (R) {
      const cles = (R.lignes || []).map((l) => l.artisan_id + '|' + l.cle).sort()
      ok(JSON.stringify(cles) === JSON.stringify(S.ATTENDU.cartes.map((c) => c.artisan_id + '|' + c.cle).sort()), 'O1 ombre : une carte par décision du compte en ombre, aucune pour le compte en simulation ni pour un autre compte, aucun doublon')
      ok((R.lignes || []).every((l) => l.origine === 'agent' && l.statut === 'en_attente' && l.mode === 'confirmation' && l.expire_le && l.departement === 'accueil' && l.motif && Array.isArray(l.sources) && l.sources.length > 0 && l.sources.every((x) => x.fait && x.source)), 'O2 chaque carte : à valider, à confirmer, échéance, département, motif, la source de chaque fait')
      const m = Object.fromEntries((R.marques || []).map((x) => [x.p_artisan, [...x.p_ids].sort()]))
      ok(JSON.stringify(m) === JSON.stringify(Object.fromEntries(Object.entries(S.ATTENDU.marques).map(([a, ids]) => [a, [...ids].sort()]))), 'O3 marques « traité » : servis, rejetés et sautés, par compte')
      ok(R.bilan && R.bilan.effets_faits === 0 && JSON.stringify(R.bilan.rejets) === JSON.stringify(S.ATTENDU.rejets), 'O4 bilan : zéro effet fait, rejets attendus (type inconnu, demande d’un autre compte)')
      ok(R.envs.every((e) => e.simulation === true), 'O5 enveloppes des chefs en simulation (rien ne sort)')
      // L'exécution n8n rapatriée doit dire la même chose.
      let X = null
      try { X = JSON.parse(T.essais) } catch { fautes.push('O6 essais n8n absents') }
      if (X) {
        const e = X.essais?.find((x) => x.nom === 'ombre')
        const lignesN8n = e?.noeuds?.['Préparer les cartes de l’ombre']?.[0]?.lignes || []
        ok(e && e.statut === 'success' && JSON.stringify(lignesN8n.map((l) => l.artisan_id + '|' + l.cle).sort()) === JSON.stringify(cles), 'O7 l’essai n8n (test_workflow) rend les mêmes cartes que le rejeu')
        const reel = X.essais?.find((x) => x.nom === 'lectures-reelles')
        ok(reel && reel.statut === 'success' && reel.noeuds?.['Interrupteur général']?.[0]?.lecture === 'ok' && reel.noeuds?.['Bilan du passage']?.[0]?.arret === 'interrupteur_general_coupe', 'O8 lecture réelle constatée : departements_reglages répond, aucun compte en marche, passage arrêté sans effet')
        for (const b of ['banc-cerveau', 'banc-argent']) ok(X.essais?.some((x) => x.nom === b && x.statut === 'success'), `O9 ${b} rejoué, vert`)
      }
    }
  }

  // C — les cartes : jamais sans source ; la migration
  let K
  try { K = await charger(T.cartes, '.ts') } catch (e) { fautes.push('C0 cartes illisibles : ' + e.message); K = null }
  if (K) {
    const base = { id: '00000000-0000-4000-8000-c00000000001', artisan_id: 'a', outil: 'reponse_prospect', statut: 'en_attente', titre: 'Répondre', apercu: {}, objet_type: null, objet_id: null, resultat_resume: null, cree_le: '2026-11-03T00:00:00Z', maj_le: '2026-11-03T00:00:00Z', expire_le: '2099-01-01T00:00:00Z', origine: 'agent', departement: 'accueil', motif: 'Une demande.', cle: 'h:decision:x' }
    ok(K.versCarteAgent({ ...base, sources: [{ fait: 'evenement', source: 'evenements_metier:1' }] }) !== null, 'C1 carte complète montrée')
    ok(K.versCarteAgent({ ...base, sources: [] }) === null && K.versCarteAgent({ ...base, sources: null }) === null && K.versCarteAgent({ ...base, sources: [{ fait: 'x' }] }) === null, 'C2 carte sans source jamais montrée')
    ok(K.versCarteAgent({ ...base, origine: 'assistant', sources: [{ fait: 'a', source: 'b' }] }) === null, 'C3 la boîte des agents ne montre que des cartes d’agents')
    ok(K.versCarteAgent({ ...base, statut: 'executee', resultat_resume: 'Réponse envoyée', sources: [{ fait: 'a', source: 'b' }] })?.fait === 'Réponse envoyée', 'C4 la ligne « fait : … » quand c’est fait')
    ok(JSON.stringify(K.DECISIONS) === JSON.stringify({ valider: 'en_cours', refuser: 'refusee' }), 'C5 valider ne pose jamais « exécutée » : l’app n’exécute rien')
  }
  if (C) {
    const sansSource = /sources: sources/.test(C.CODES['Préparer les cartes de l’ombre']) && /const sources = \[/.test(C.CODES['Préparer les cartes de l’ombre'])
    ok(sansSource, 'C6 chaque carte écrite par n8n porte ses sources')
    ok(C.ECRITURES['Écrire les cartes (ombre)'].url.endsWith('?on_conflict=artisan_id,cle') && /ignore-duplicates/.test(C.ECRITURES['Écrire les cartes (ombre)'].prefer), 'C7 écriture des cartes idempotente (on_conflict artisan_id,cle, doublons ignorés)')
    ok(/k\.organisation_id !== lot\.artisan_id/.test(C.CODES['Préparer les cartes de l’ombre']) && /lot\.palier !== 'ombre'/.test(C.CODES['Préparer les cartes de l’ombre']), 'C8 carte écrite seulement pour le compte servi, en ombre')
  }
  const M = T.migration.replace(/^--.*$/gm, '')
  ok(/origine <> 'agent' or \([\s\S]*sources is not null[\s\S]*mode = 'confirmation' and expire_le is not null/.test(M), 'C9 0194 : une carte d’agent a toujours ses sources, est à confirmer et échoit')
  ok(/jsonb_array_length\(sources\) between 1 and 40/.test(M), 'C10 0194 : au moins une source')
  ok(/create unique index if not exists assistant_actions_cle_unique on public\.assistant_actions \(artisan_id, cle\);/.test(M), 'C11 0194 : clé unique par compte, index complet (on_conflict de PostgREST)')
  ok(/new\.origine = 'agent' and new\.statut <> 'en_attente'/.test(M), 'C12 0194 : une carte d’agent naît à valider')
  ok(/grant select on public\.n8n_evenements_a_traiter to service_role/.test(M) && !/drop table|truncate|delete from/i.test(M), 'C13 0194 : vue ouverte à la voie de n8n, aucune destruction')
  ok(/raise exception '0194 : 0193/.test(M), 'C14 0194 : refuse la pose sans 0193')
  ok(T.jumeau.includes('create unique index if not exists assistant_actions_cle_unique') && T.jumeau.includes('assistant_actions_agent_naissance'), 'C15 jumeau à coller présent et complet')

  // B — la boîte et sa route
  // 03/11 au soir : levé après l'essai réel de l'ombre réussi (compte de test) ; le juge exige qu'il existe, sa valeur est une décision.
  ok(/boiteAgents: (true|false),/.test(T.flags), 'B1 drapeau boiteAgents déclaré')
  ok(/export default function BoiteAgents\(\) \{\n  if \(!actif\('boiteAgents'\)\) return null/.test(T.boite), 'B2 drapeau baissé : la boîte ne rend rien (rien dans le DOM) et n’appelle rien')
  ok((T.route.match(/if \(!actif\('boiteAgents'\)\) return NextResponse\.json\(\{ error: 'Introuvable' \}, \{ status: 404 \}\)/g) || []).length === 2, 'B3 drapeau baissé : GET et POST répondent 404')
  ok(/<BoiteAgents \/>/.test(T.gestion) && /import BoiteAgents from ["']\.\/BoiteAgents["']/.test(T.gestion), 'B4 la boîte est dans l’outil de gestion')
  const ENVOI = /sendEmail|@\/lib\/email|notifier|executeurs|realisateurs|confirmerAction|piloter|resend|twilio|fetch\(/i
  ok(!ENVOI.test(T.route), 'B5 la route n’envoie rien (aucun e-mail, aucun réalisateur, aucun appel sortant)')
  ok(/\.eq\('artisan_id', g\.uid\)/.test(T.route) && (T.route.match(/\.eq\('artisan_id', g\.uid\)/g) || []).length >= 3, 'B6 chaque lecture et écriture filtrée par le compte de la session')
  ok(/\.eq\('statut', 'en_attente'\)/.test(T.route) && /\.update\(\{ statut: DECISIONS\[decision\], maj_le: maintenant \}\)/.test(T.route), 'B7 réclamation atomique : seule une carte à valider change, vers la décision')
  ok(!/peut\(|plan ===|'studio'|'signature'/.test(T.route), 'B8 même règle sur toutes les offres : le clic ne fait rien partir, Studio compris')
  ok(!ENVOI.test(T.boite.replace("from './client'", '')) && (T.boite.match(/appel(<[^>]*>)?\('\/api\/assistant\/agents'/g) || []).length === 2, 'B9 les boutons n’appellent que la route des agents')
  ok(/data-decision="valider"/.test(T.boite) && /data-decision="refuser"/.test(T.boite) && /Pourquoi :/.test(T.boite) && /Fait :/.test(T.boite), 'B10 la carte montre ce qui est proposé, pourquoi, « Fait : », Valider et Refuser')

  // S — le lanceur
  const suites = T.lanceur.slice(0, T.lanceur.indexOf('export const HORS_LANCEUR'))
  ok(/args: \['scripts\/branchement-reel-qa\.mjs'\], cout: 'gratuit' \}/.test(suites), 'S1 le juge est dans SUITES (lanceur), sans coût IA')
  return fautes
}

// ── Les mutants : chacun DOIT faire rougir le juge ─────────────────────────────────────────────────────────────────────────────
const remplacer = (cle, de, vers) => (T) => { if (!T[cle].includes(de)) throw new Error(`mutant sans prise sur ${cle} : ${de.slice(0, 60)}`); return { ...T, [cle]: T[cle].replace(de, vers) } }
// Un mutant du Cerveau change la source ET l'export (même code des deux côtés) : la comparaison octet pour octet ne le voit plus, seul le
// comportement rejoué peut le tuer.
const remplacerCerveau = (de, vers) => (T) => {
  if (!T.cerveau.includes(de)) throw new Error('mutant sans prise sur cerveau : ' + de.slice(0, 60))
  const x = JSON.parse(T.export); const w = x.workflow || x
  for (const n of w.nodes) if (typeof n.parameters?.jsCode === 'string') n.parameters.jsCode = n.parameters.jsCode.replace(de, vers)
  return { ...T, cerveau: T.cerveau.replace(de, vers), export: JSON.stringify(x) }
}
const MUTANTS = [
  ['demande cassée si l’écriture échoue (route)', remplacer('leads', "if (!ev.ok) console.warn('[leads] événement demande_recue non rangé :', ev.raison)", "if (!ev.ok) return NextResponse.json({ error: 'Enregistrement impossible' }, { status: 500 })")],
  ['demande cassée si l’écriture échoue (écrivain qui relance l’exception)', remplacer('ecrivain', "  } catch (e) {\n    return { ok: false, raison: 'exception:'", "  } catch (e) {\n    throw e\n    return { ok: false, raison: 'exception:'")],
  ['écriture sans délai (base muette = demande bloquée)', remplacer('ecrivain', 'return await Promise.race([ecriture, delai])', 'return await ecriture')],
  ['écriture non idempotente', remplacer('ecrivain', "{ onConflict: 'artisan_id,cle', ignoreDuplicates: true }", "{ onConflict: 'id', ignoreDuplicates: false }")],
  ['texte libre dans les faits', remplacer('ecrivain', "else if (typeof v === 'string' && CHAINE_PERMISE.test(v)) sortie[k] = v", "else if (typeof v === 'string') sortie[k] = v")],
  ['lecture vide restante dans le Cerveau', (T) => { const x = JSON.parse(T.export); const w = x.workflow || x; w.nodes.push({ name: "Lire l'interrupteur général (simulation : épinglé)", type: 'n8n-nodes-base.noOp', typeVersion: 1, parameters: {} }); return { ...T, export: JSON.stringify(x) } }],
  ['lecture sans filtre de compte', (T) => { const x = JSON.parse(T.export); const w = x.workflow || x; const n = w.nodes.find((y) => y.name === 'Lire les événements non traités'); n.parameters.queryParameters.parameters = n.parameters.queryParameters.parameters.filter((p) => p.name !== 'artisan_id'); return { ...T, export: JSON.stringify(x) } }],
  ['code n8n différent de la source', (T) => { const x = JSON.parse(T.export); const w = x.workflow || x; const n = w.nodes.find((y) => y.name === 'Aiguiller'); n.parameters.jsCode += '\n// retouche'; return { ...T, export: JSON.stringify(x) } }],
  ['palier réel servi', remplacerCerveau("const SERVIS = ['simulation', 'ombre'];", "const SERVIS = ['simulation', 'ombre', 'reel'];")],
  ['porte de simulation ouverte en ombre', remplacerCerveau("s.push({ json: { contrat: 'presti-dep-' + dep + '@1', organisation_id: c.artisan_id, simulation: true,", "s.push({ json: { contrat: 'presti-dep-' + dep + '@1', organisation_id: c.artisan_id, simulation: palier !== 'ombre',")],
  ['carte sans source (n8n)', remplacerCerveau('sources: sources, cle: k.cle });', 'cle: k.cle });')],
  ['carte sans source (écran)', remplacer('cartes', '  if (!Array.isArray(v) || v.length === 0 || v.length > 40) return null', '  if (!Array.isArray(v)) return []\n  if (v.length > 40) return null')],
  ['carte écrite en simulation', remplacerCerveau("if (!lot || lot.palier !== 'ombre') continue;", 'if (!lot) continue;')],
  ['carte d’un autre compte écrite', remplacerCerveau('if (k.organisation_id !== lot.artisan_id || !CLE.test', 'if (!CLE.test')],
  ['bouton qui envoie en Studio (route)', remplacer('route', "import { consommerLimite } from '@/lib/limites'\n", "import { consommerLimite } from '@/lib/limites'\nimport { sendEmail } from '@/lib/email'\n")],
  ['bouton qui exécute (valider = exécutée)', remplacer('cartes', "export const DECISIONS = { valider: 'en_cours', refuser: 'refusee' } as const", "export const DECISIONS = { valider: 'executee', refuser: 'refusee' } as const")],
  ['boîte visible avec le drapeau baissé (composant)', remplacer('boite', "  if (!actif('boiteAgents')) return null\n", '')],
  ['drapeau boiteAgents retiré', remplacer('flags', /boiteAgents: (true|false),/.exec(T.flags)?.[0] ?? 'boiteAgents:', 'boiteAgentsRetire: false,')],
  ['route ouverte avec le drapeau baissé', remplacer('route', "  if (!actif('boiteAgents')) return NextResponse.json({ error: 'Introuvable' }, { status: 404 })\n  const g = await gardeAssistant(req)\n  if ('reponse' in g) return g.reponse\n  const b =", "  const g = await gardeAssistant(req)\n  if ('reponse' in g) return g.reponse\n  const b =")],
  ['décision sur la carte d’un autre compte', remplacer('route', "    .update({ statut: DECISIONS[decision], maj_le: maintenant })\n    .eq('id', id)\n    .eq('artisan_id', g.uid)\n", "    .update({ statut: DECISIONS[decision], maj_le: maintenant })\n    .eq('id', id)\n")],
  ['migration sans exigence de source', remplacer('migration', 'departement is not null and motif is not null and sources is not null and cle is not null', 'departement is not null and motif is not null and cle is not null')],
  ['index de clé partiel (on_conflict cassé)', remplacer('migration', 'create unique index if not exists assistant_actions_cle_unique on public.assistant_actions (artisan_id, cle);', 'create unique index if not exists assistant_actions_cle_unique on public.assistant_actions (artisan_id, cle) where cle is not null;')],
  ['juge absent du lanceur', remplacer('lanceur', "args: ['scripts/branchement-reel-qa.mjs']", "args: ['scripts/branchement-reel-qa-absent.mjs']")],
]

const T0 = Object.fromEntries(Object.entries(F).map(([k, rel]) => [k, fs.existsSync(path.join(RACINE, rel)) ? lire(rel) : '']))
console.log('branchement-reel-qa (036-030) — hors ligne\n')
const fautes = await juger(T0)
if (fautes.length) { console.log('ROUGE sur le dépôt :'); for (const f of fautes) console.log('  ✗ ' + f) }
else console.log('✅ dépôt : toutes les règles E, L, O, C, B, S tiennent')

let tues = 0
const survivants = []
for (const [nom, muter] of MUTANTS) {
  let T
  try { T = muter(T0) } catch (e) { survivants.push(nom + ' (' + e.message + ')'); continue }
  const f = await juger(T)
  if (f.length) { tues++; console.log(`  ✓ mutant tué — ${nom} : ${f[0]}`) } else survivants.push(nom)
}
console.log(`\nmutants : ${tues}/${MUTANTS.length} tués`)
for (const s of survivants) console.log('  ✗ survivant — ' + s)
fs.rmSync(TMP, { recursive: true, force: true })
const vert = fautes.length === 0 && survivants.length === 0
console.log(vert ? '\nVERT' : '\nROUGE')
process.exit(vert ? 0 : 1)
