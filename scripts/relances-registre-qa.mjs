#!/usr/bin/env node
// scripts/relances-registre-qa.mjs — juge du registre commun des relances (02/11, S4 du chantier 4 :
// plans/011-cadrage-01-11/chantier-4-assistant-plan.md §3). Quatre chemins relancent un client au nom de l'artisan — l'assistant et le
// pilote (assistant_actions), le CRM (crm_rappels), les impayés (relances_impayes), la conversation (messages « relance ») — et chacun
// ne lisait que sa trace : un même client pouvait recevoir deux relances le même jour. lib/relancesRegistre.ts les lit toutes.
// Ce juge prouve, sans base ni réseau ni e-mail (un client PostgREST en mémoire) :
//  A. la décision pure : refus sous 3 jours, permis à 3 jours pile et au-delà, registre illisible = refus, `sauf` ;
//  B. le dossier et ses traces : pour chacune des 6 paires de chemins, la seconde relance est refusée dans les 3 jours, permise après ;
//     une lecture en erreur refuse ; une table absente est ignorée et dite ; un autre compte ne compte pas ; une relance proposée non plus ;
//  C. les 6 appelants passent par le registre AVANT l'envoi (lecture du source) ;
//  D. trois MUTANTS (le correctif retiré, dans une copie) que le juge doit voir : `<` devenu `<=`, l'erreur de lecture avalée, un appel ôté.
// Aucune donnée réelle : comptes, devis et dates inventés.
//
// Usage : node --experimental-strip-types --import ./scripts/ts-loader.mjs scripts/relances-registre-qa.mjs
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

process.removeAllListeners('warning')
process.on('warning', (w) => { if (w.code !== 'MODULE_TYPELESS_PACKAGE_JSON' && w.name !== 'ExperimentalWarning') console.error(w) })
// lib/supabaseAdmin lit ces variables à l'import : une base qui n'existe pas, aucune clé réelle. Le juge injecte son propre client.
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://base.test'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'anon-essai'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-essai'
let reseau = 0
globalThis.fetch = async () => { reseau++; throw new Error('réseau interdit dans ce juge') }

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const lire = (rel) => fs.readFileSync(path.join(RACINE, rel), 'utf8').replace(/\r\n/g, '\n')
let verts = 0
const rouges = []
const ok = (nom, cond, detail = '') => { if (cond) verts++; else rouges.push(nom); console.log(`${cond ? 'PASS' : 'FAIL'} ${nom}${cond || !detail ? '' : ' — ' + String(detail).slice(0, 400)}`) }

const REG_REL = 'lib/relancesRegistre.ts'
const R = await import(pathToFileURL(path.join(RACINE, REG_REL)).href)
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'presti-registre-'))
let nCopies = 0
/** Une copie MUTÉE du registre (chaque motif doit exister, sinon le mutant serait l'original et ne prouverait rien). */
async function mutant(avant, apres) {
  const code = lire(REG_REL)
  if (!code.includes(avant)) throw new Error(`mutant : motif introuvable « ${avant.slice(0, 80)} »`)
  const f = path.join(TMP, `relancesRegistre-mutant-${++nCopies}.ts`)
  fs.writeFileSync(f, code.replace(avant, apres))
  return import(pathToFileURL(f).href)
}

// ═══════════════════════ Le client PostgREST en mémoire (select, eq, in, not is null, order, limit) ═══════════════════════
function client(T, { pannes = {}, absentes = [] } = {}) {
  return {
    from(table) {
      const filtres = []
      let tri = null, lim = null
      const q = {
        select() { return q },
        eq(c, v) { filtres.push((l) => l[c] === v); return q },
        in(c, vs) { filtres.push((l) => vs.includes(l[c])); return q },
        not(c, op, v) { if (op === 'is' && v === null) filtres.push((l) => l[c] !== null && l[c] !== undefined); return q },
        order(c, o) { tri = { c, desc: o?.ascending === false }; return q },
        limit(n) { lim = n; return q },
        then(ok_, ko_) {
          let res
          if (absentes.includes(table)) res = { data: null, error: { code: 'PGRST205', message: `Could not find the table 'public.${table}' in the schema cache` } }
          else if (pannes[table]) res = { data: null, error: { code: '57014', message: pannes[table] } }
          else {
            let r = (T[table] ?? []).filter((l) => filtres.every((f) => f(l)))
            if (tri) r = [...r].sort((a, b) => (String(a[tri.c]) < String(b[tri.c]) ? -1 : 1) * (tri.desc ? -1 : 1))
            if (lim !== null) r = r.slice(0, lim)
            res = { data: r.map((l) => ({ ...l })), error: null }
          }
          return Promise.resolve(res).then(ok_, ko_)
        },
      }
      return q
    },
  }
}

const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const D = id(1), L = id(2), F1 = id(3), F2 = id(4), D2 = id(5), L2 = id(6)
const MAINTENANT = new Date('2026-11-02T10:00:00Z')
const ilYa = (jours, heures = 0) => new Date(MAINTENANT.getTime() - jours * 86_400_000 - heures * 3_600_000).toISOString()
/** Le dossier du compte A : un devis D (conversation L) et deux factures F1, F2 de ce devis ; un second dossier D2/L2 sans lien. */
const base = () => ({
  leads: [{ id: L, artisan_id: A }, { id: L2, artisan_id: A }],
  devis: [{ id: D, artisan_id: A, lead_id: L }, { id: D2, artisan_id: A, lead_id: L2 }],
  factures: [{ id: F1, artisan_id: A, devis_id: D }, { id: F2, artisan_id: A, devis_id: D }],
  assistant_actions: [], crm_rappels: [], relances_impayes: [], messages: [],
})
// Une trace PARTIE par chacun des quatre chemins, sur l'objet qui est le sien.
const TRACE = {
  assistant: (T, le, objet = D, art = A) => T.assistant_actions.push({ artisan_id: art, outil: objet === D || objet === D2 ? 'relancer_devis' : 'relancer_facture', objet_id: objet, statut: 'executee', maj_le: le }),
  crm: (T, le, devis = D, art = A) => T.crm_rappels.push({ artisan_id: art, devis_id: devis, type: 'relancer_devis', envoye_le: le }),
  impayes: (T, le, facture = F1, art = A) => T.relances_impayes.push({ artisan_id: art, facture_id: facture, statut: 'envoyee', envoyee_le: le }),
  conversation: (T, le, lead = L, etat = null) => T.messages.push({ lead_id: lead, type: 'relance', sens: 'out', etat, sent_at: le }),
}
// Ce que chaque chemin DEMANDE avant d'envoyer (son objet, et le `sauf` qu'il passe : lib/relancesImpayesMagasin.ts, app/api/cron/relances).
const DEMANDE = {
  assistant: { objet: { type: 'devis', id: D } },
  crm: { objet: { type: 'devis', id: D } },
  impayes: { objet: { type: 'facture', id: F1 }, sauf: 'impayes' },
  conversation: { objet: { type: 'lead', id: L }, sauf: 'conversation' },
}
async function verdict(mod, T, chemin, opts = {}) {
  const d = DEMANDE[chemin]
  const h = await mod.historiqueRelances(A, d.objet, client(T, opts))
  return { h, v: mod.relanceRecente(h, MAINTENANT, { sauf: d.sauf }) }
}

try {
  // ═══════════════════════ A. La décision pure ═══════════════════════
  console.log('── A. La décision (pure)')
  const h = (...traces) => ({ ok: true, traces, ignorees: [] })
  ok('A1 délai commun : 3 jours, et l’assistant lit le même (RELANCE_DELAI_JOURS, un seul chiffre)', R.RELANCE_DELAI_JOURS === 3 && /RELANCE_DELAI_JOURS = DELAI_REGISTRE/.test(lire('lib/assistant/actions-serveur.ts')))
  ok('A2 relancé il y a 2 jours 23 h : refus « récente », avec la dernière trace', (() => { const v = R.relanceRecente(h({ chemin: 'crm', le: ilYa(2, 23) }), MAINTENANT); return v.refus && v.raison === 'recente' && v.derniere.chemin === 'crm' })())
  ok('A3 relancé il y a 3 jours pile : permis (strictement moins de 3 jours)', R.relanceRecente(h({ chemin: 'crm', le: ilYa(3) }), MAINTENANT).refus === false)
  ok('A4 relancé il y a 4 jours : permis', R.relanceRecente(h({ chemin: 'assistant', le: ilYa(4) }), MAINTENANT).refus === false)
  ok('A5 aucun historique : permis', R.relanceRecente(h(), MAINTENANT).refus === false)
  ok('A6 registre illisible : refus « illisible » (côté sûr)', (() => { const v = R.relanceRecente({ ok: false, erreur: 'base en panne' }, MAINTENANT); return v.refus && v.raison === 'illisible' })())
  ok('A7 `sauf` : le chemin qui garde son propre rythme n’est pas bloqué par ses propres traces, mais l’est par celles des autres',
    R.relanceRecente(h({ chemin: 'impayes', le: ilYa(1) }), MAINTENANT, { sauf: 'impayes' }).refus === false && R.relanceRecente(h({ chemin: 'impayes', le: ilYa(1) }, { chemin: 'crm', le: ilYa(1) }), MAINTENANT, { sauf: 'impayes' }).refus === true)
  ok('A8 une date illisible compte comme récente (côté sûr)', R.relanceRecente(h({ chemin: 'conversation', le: 'pas une date' }), MAINTENANT).refus === true)
  const v2 = R.relanceRecente(h({ chemin: 'crm', le: '2026-10-31T09:00:00Z' }), MAINTENANT)
  ok('A9 la phrase du refus nomme le chemin et la date, sans « Presti »', /depuis le CRM le 31\/10/.test(R.phraseRefus(v2, (iso) => new Date(iso).toLocaleDateString('fr-FR', { timeZone: 'Europe/Paris' }))) && !/Presti/.test(R.phraseRefus(v2, () => 'x')) && /illisible/.test(R.phraseRefus({ refus: true, raison: 'illisible', erreur: 'x' }, () => '')))

  // ═══════════════════════ B. Le dossier et ses traces ═══════════════════════
  console.log('\n── B. Le dossier, les 6 paires de chemins')
  const CHEMINS = ['assistant', 'crm', 'impayes', 'conversation']
  for (let i = 0; i < CHEMINS.length; i++) for (let j = i + 1; j < CHEMINS.length; j++) {
    for (const [premier, second] of [[CHEMINS[i], CHEMINS[j]], [CHEMINS[j], CHEMINS[i]]]) {
      const T = base(); TRACE[premier](T, ilYa(1))
      const dedans = await verdict(R, T, second)
      const T2 = base(); TRACE[premier](T2, ilYa(4))
      const apres = await verdict(R, T2, second)
      ok(`B ${premier} puis ${second} : refusé à 1 jour, permis à 4 jours`, dedans.v.refus === true && dedans.v.raison === 'recente' && dedans.v.derniere?.chemin === premier && apres.v.refus === false,
        JSON.stringify({ dedans: dedans.v, apres: apres.v, h: dedans.h }))
    }
  }
  {
    const T = base(); TRACE.crm(T, ilYa(1), D2)
    ok('B13 une relance d’un AUTRE dossier du même compte ne bloque pas celui-ci', (await verdict(R, T, 'assistant')).v.refus === false)
    const T2 = base(); TRACE.assistant(T2, ilYa(1), D, B); TRACE.crm(T2, ilYa(1), D, B); TRACE.impayes(T2, ilYa(1), F1, B)
    ok('B14 isolation : les traces d’un autre compte sur les mêmes identifiants ne comptent pas', (await verdict(R, T2, 'assistant')).v.refus === false && (await verdict(R, T2, 'impayes')).v.refus === false)
    const T3 = base(); TRACE.conversation(T3, ilYa(0, 2), L, 'proposition'); TRACE.conversation(T3, ilYa(0, 1), L, 'rejete')
    ok('B15 une relance de conversation PROPOSÉE (offre Studio, pas validée) ou écartée n’est pas partie : elle ne compte pas', (await verdict(R, T3, 'crm')).v.refus === false)
    const T4 = base(); TRACE.impayes(T4, ilYa(1), F2)
    ok('B16 la seconde facture du même devis (acompte, solde) est du même dossier : sa relance bloque celle de F1 par l’assistant', (await verdict(R, T4, 'assistant')).v.refus === true)
  }
  console.log('\n── B bis. Les lectures en erreur et les tables absentes')
  for (const table of ['devis', 'factures', 'assistant_actions', 'crm_rappels', 'relances_impayes', 'messages']) {
    const T = base()
    const r = await verdict(R, T, 'assistant', { pannes: { [table]: 'canceling statement due to statement timeout' } })
    ok(`B17 lecture de « ${table} » en erreur : registre illisible, la relance est REFUSÉE`, r.h.ok === false && r.v.refus === true && r.v.raison === 'illisible', JSON.stringify(r))
  }
  {
    const T = base(); TRACE.assistant(T, ilYa(1))
    const r = await verdict(R, T, 'conversation', { absentes: ['crm_rappels'] })
    ok('B18 une table absente (migration non collée) est ignorée et DITE ; les autres traces comptent toujours', r.h.ok === true && r.h.ignorees.includes('crm_rappels') && r.v.refus === true && r.v.derniere?.chemin === 'assistant', JSON.stringify(r))
    const inconnu = await R.historiqueRelances(A, { type: 'devis', id: id(99) }, client(base()))
    const autre = await R.historiqueRelances(B, { type: 'devis', id: D }, client(base()))
    ok('B19 un objet absent du compte (ou d’un autre compte) : illisible, donc refus — jamais « jamais relancé »', inconnu.ok === false && autre.ok === false && R.relanceRecente(autre, MAINTENANT).refus === true)
  }

  // ═══════════════════════ C. Les six appelants, AVANT l'envoi ═══════════════════════
  console.log('\n── C. Les appelants (lecture du source)')
  const sans = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
  const APPELANTS = {
    'assistant (proposition et réalisation)': (src) => {
      const s = sans(src)
      const r = (nom) => s.slice(s.indexOf(`R.${nom} = async`), s.indexOf('\n  }', s.indexOf(`R.${nom} = async`)))
      const p = (nom) => s.slice(s.indexOf(`P.${nom} = async`), s.indexOf('\n  }', s.indexOf(`P.${nom} = async`)))
      return /async function registre\(objet: ObjetRelance\)[\s\S]{0,200}\(dep\.historiqueRelances \?\? historiqueRelances\)\(ctx\.uid, objet\)/.test(s)
        && r('relancer_devis').indexOf("registre({ type: 'devis', id: d.id })") > 0 && r('relancer_devis').indexOf("registre({ type: 'devis'") < r('relancer_devis').indexOf('envoyerRelance(')
        && r('relancer_facture').indexOf("registre({ type: 'facture', id: f.id })") > 0 && r('relancer_facture').indexOf("registre({ type: 'facture'") < r('relancer_facture').indexOf('envoyerRelance(')
        && /registre\(\{ type: 'devis', id: d\.id \}\)/.test(p('relancer_devis')) && /registre\(\{ type: 'facture', id: f\.id \}\)/.test(p('relancer_facture'))
    },
    'pilote (dejaRelance)': (src) => {
      const s = sans(src)
      return /const dejaRelance = async \(type: 'devis' \| 'facture', objetId: string\)[\s\S]{0,160}historiqueRelances\(uid, \{ type, id: objetId \}\)/.test(s) && !/dernierEnvoi\([^)]*\)\.catch\(\(\) => null\)/.test(s)
        && s.indexOf("await dejaRelance('devis', d.id)") > 0 && s.indexOf("await dejaRelance('devis', d.id)") < s.indexOf('await mail(to, t.objet, t.texte)', s.indexOf("await dejaRelance('devis', d.id)"))
        && s.indexOf("await dejaRelance('facture', f.id)") > 0
    },
    'CRM (route d’envoi)': (src) => {
      const s = sans(src)
      return s.indexOf("historiqueRelances(g.uid, { type: 'devis', id: devisId })") > s.indexOf('consommerLimite(') && s.indexOf("historiqueRelances(g.uid, { type: 'devis', id: devisId })") < s.indexOf('await sendEmail(') && /if \(reg\.refus\) return/.test(s)
    },
    'impayés (magasin et passage)': (src) => {
      const [mag, tourS] = src
      return /relanceRecente\(await historiqueRelances\(artisanId, \{ type: 'facture', id: facture\.id \}\), maintenant, \{ sauf: 'impayes' \}\)\.refus/.test(sans(mag))
        && sans(tourS).indexOf('relanceeAilleurs: ailleurs') > 0 && sans(tourS).indexOf('relanceeAilleurs: ailleurs') < sans(tourS).indexOf('m.prendre(')
    },
    'conversation (cron du matin)': (src) => {
      const s = sans(src)
      const i = s.indexOf("historiqueRelances(lead.artisan_id, { type: 'lead', id: lead.id }), new Date(), { sauf: 'conversation' })")
      return i > 0 && i < s.indexOf(".update({ envoyee: true }).eq('id', r.id).eq('envoyee', false)") && i < s.indexOf('await sendEmail(')
    },
  }
  const SOURCES = {
    'assistant (proposition et réalisation)': () => lire('lib/assistant/actions-serveur.ts'),
    'pilote (dejaRelance)': () => lire('lib/pilote/executeur.ts'),
    'CRM (route d’envoi)': () => lire('app/api/crm/relances/envoyer/route.ts'),
    'impayés (magasin et passage)': () => [lire('lib/relancesImpayesMagasin.ts'), lire('lib/relancesImpayesTour.ts')],
    'conversation (cron du matin)': () => lire('app/api/cron/relances/route.ts'),
  }
  for (const [nom, juge] of Object.entries(APPELANTS)) ok(`C ${nom} : le registre est lu AVANT l’envoi`, juge(SOURCES[nom]()))
  ok('C6 la décision des impayés connaît la raison « deja_relancee_ailleurs » (lib/relancesImpayes.ts)', /if \(p\.relanceeAilleurs\) return rien\('deja_relancee_ailleurs'\)/.test(lire('lib/relancesImpayes.ts')))
  const lanceur = lire('scripts/tout-verifier.mjs')
  ok('C7 ce juge est au tableau SUITES de scripts/tout-verifier.mjs (cout: gratuit)', /'scripts\/relances-registre-qa\.mjs'\], cout: 'gratuit'/.test(lanceur.split('const retenues')[0]))

  // ═══════════════════════ D. Les mutants ═══════════════════════
  console.log('\n── D. Mutants : le correctif retiré, le juge doit le voir')
  const m1 = await mutant('return !Number.isFinite(le) || t - le < delai', 'return !Number.isFinite(le) || t - le <= delai')
  ok('D1 MUTANT (`<` devenu `<=`) : le juge VOIT la différence — relancé il y a 3 jours pile, le mutant refuse', m1.relanceRecente(h({ chemin: 'crm', le: ilYa(3) }), MAINTENANT).refus === true && R.relanceRecente(h({ chemin: 'crm', le: ilYa(3) }), MAINTENANT).refus === false)
  const m2 = await mutant("      throw new Error(`${table} : ${error.message ?? 'lecture refusée'}`)", '      return []')
  const r2 = await verdict(m2, base(), 'assistant', { pannes: { crm_rappels: 'timeout' } })
  const T2 = base(); TRACE.crm(T2, ilYa(1))
  const r2b = await verdict(m2, T2, 'assistant', { pannes: { crm_rappels: 'timeout' } })
  ok('D2 MUTANT (erreur de lecture avalée = la brèche d’avant) : le juge VOIT la brèche — le mutant laisse partir, l’original refuse',
    r2.v.refus === false && r2b.v.refus === false && (await verdict(R, T2, 'assistant', { pannes: { crm_rappels: 'timeout' } })).v.refus === true)
  const crmSansAppel = lire('app/api/crm/relances/envoyer/route.ts').replace(/  const reg = relanceRecente\(await historiqueRelances\(g\.uid[^\n]*\n  if \(reg\.refus\)[^\n]*\n/, '')
  ok('D3 MUTANT (l’appel ôté de la route du CRM) : le contrôle C du CRM rougit', crmSansAppel !== lire('app/api/crm/relances/envoyer/route.ts') && APPELANTS['CRM (route d’envoi)'](crmSansAppel) === false)
  ok('D4 aucun appel réseau : le client en mémoire a servi toutes les lectures', reseau === 0, `${reseau} appel(s)`)
} catch (e) {
  rouges.push('exception'); console.log(`FAIL exception — ${e instanceof Error ? e.stack : e}`)
} finally {
  try { fs.rmSync(TMP, { recursive: true, force: true }) } catch { /* dossier temporaire : le système le videra */ }
}

console.log(`\n${verts} PASS, ${rouges.length} FAIL`)
if (rouges.length) { console.log('Rouges :\n- ' + rouges.join('\n- ')); process.exitCode = 1 }
