#!/usr/bin/env node
// scripts/pause-qa.mjs — le juge de la fiche 026-044 (l'arrêt d'urgence, pause générale), écrit par Claude Code en 026-038
// (PA-8 et PA-9 réécrits par la voie gratuite du 25/09, PA-10 par la revue transverse du 25/09).
// Le code est importé dans un processus à part (doublures/sonde.mjs), sans réseau ni secret, contre un faux PostgREST
// (scripts/lib/faux-postgrest.mjs) et les doublures de lib/direction/garde, reconfirmation et journal, qui consignent chaque
// appel avec son rang (partagé avec le faux PostgREST : l'ordre « journal, puis écriture » se lit).
//
//   PA-1  lib/agents/pause.ts : PAUSE_GENERALE=1 → { active: true, source: 'variable' } sans aucun appel ; base true → 'base' ;
//         base false → inactive ; base en erreur 500, puis port fermé → { active: true, source: 'panne' }.
//   PA-2  POST /api/controle/pause : sans fondateur → le refus de la garde ; partenaire en lecture → 403 ; reconfirmation
//         absente ou rejouée → 403 ; motif de 2 signes → 400 ; journal en panne → 503 — et dans ces six cas aucun appel à
//         ops_interrupteur_poser ; tout bon → un appel, p_auteur = uid du fondateur, APRÈS le journal, action pause_generale.
//   PA-3  GET : fondateur, domaine securite → l'état de pauseGenerale() ; sans fondateur ou partenaire → refus, sans appel.
//   PA-4  le diff de lib/direction/journal.ts avec HEAD se limite à 'pause_generale' dans Action ; epurer, journaliser et
//         refusJournal identiques à HEAD.
//   PA-5  docs/agents/pause-generale.md : quatre voies (station, pont Telegram, Claude Code par execute_sql, variable Vercel
//         PAUSE_GENERALE avec « redéploiement », jamais PRESTI_PAUSE_AGENTS) ; ce qui passe dit que `envoye` n'est jamais
//         refusé, ce qui est coupé ne cite pas `envoye` ; bloc SQL lisible par le tokenizer de sql-nu.mjs, un update de
//         ops.interrupteurs … where nom = 'pause_generale' et un insert dans ops.evenements, rien d'autre, ni delete, drop,
//         grant, alter ou truncate ; aucune chaîne qui ressemble à un secret.
//   PA-6  npm run typecheck en code 0, --listFiles : pause.ts et la route vérifiés, sans @ts-nocheck ni @ts-ignore.
//   PA-7  (--reel, après déploiement) https://prestiapp.fr/api/controle/pause : GET sans session → 401 ou 404 ; POST sans
//         session → refus. L'interrupteur de production n'est jamais basculé.
//   PA-8  la doc : première ligne après le titre (dans la minute, Facteur, Répondeur, réponses Meta, porteur, route travail) ;
//         ni « séquenceur » ni « campagnes » ; ce qui est coupé cite Facteur, porteur, Répondeur, réponses privées,
//         messagerie, Crieur, et Publora (ce qui y est programmé part et se retire dans Publora) ; la voie SQL dit que Claude
//         Code l'exécute ; ce qui passe cite la réception, l'opposition d'un STOP, la livraison des commandes payées ; ce qui
//         est coupé ne cite pas la réception.
//   PA-9  la réponse du POST, actif true comme false, ne porte aucun champ sequenceur ; pause.ts et la route ne contiennent ni
//         fetch(, ni sequenceur, ni lemlist, ni instantly, ni lib/agents/acquisition.
//   PA-10 la doc ne contient ni « SQL Editor » ni coller/collez/collée ; la voie SQL nomme Claude Code et execute_sql ; la voie
//         du pont nomme /pause et dit qu'elle ne lève jamais la pause ; le bloc SQL porte 'urgence execute_sql', plus
//         « urgence SQL Editor ».
//
// Usage : node scripts/pause-qa.mjs [--racine=<dossier>] [--temoin] [--reel]
//   --temoin : chaque critère sur le témoin (doublures/temoins/, lib/direction/journal.ts dérivé de HEAD) doit être VERT, puis
//              chaque sabotage déclaré plus bas doit rendre son critère ROUGE ; plus l'auto-contrôle du faux PostgREST.
// Sortie : une ligne par critère, puis « pause-qa : PASS » ou « … : FAIL — ids ». Code 0 si tout est vert, 1 sinon, 2 si un
// préalable manque.
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as C from './fixtures/026-horloge-bus/doublures/commun.mjs'
import { sansCommentaires as sansCommentairesSql } from './sql-nu.mjs'

const JUGE = 'pause-qa'
const FICHIER = fileURLToPath(import.meta.url)
const IDS = ['PA-1', 'PA-2', 'PA-3', 'PA-4', 'PA-5', 'PA-6', 'PA-7', 'PA-8', 'PA-9', 'PA-10']
const PA = 'lib/agents/pause.ts', RT = 'app/api/controle/pause/route.ts', JN = 'lib/direction/journal.ts', DOC = 'docs/agents/pause-generale.md', BU = 'lib/agents/bus.ts'
const DOUBLURES = ['lib/direction/garde', 'lib/direction/reconfirmation', 'lib/direction/journal']
const { court, hasard } = C

const res = (echecs, resume = '') => ({ ok: echecs.length === 0, echecs, resume })
const nonJuge = (racine, rels, id = 'PA-1', soi = false) => { const a = rels.filter((r) => !C.existe(racine, r)); return a.length ? res(a.map((r) => (soi ? `${r} absent` : `non jugé : ${r} absent (${id})`))) : null }
const sonde = (nom, racine, params = {}, extra = {}) => C.lancerSonde({ juge: JUGE, jugeFichier: FICHIER, nom, racine, params, doublures: DOUBLURES, ...extra })
const deSonde = (x, cle = 'echecs', cleResume = 'resume') => (x.ok ? res(x.res[cle] || ['résultat de sonde sans liste'], x.res[cleResume] || '') : res([x.erreur]))

// ── Côté sonde ─────────────────────────────────────────────────────────────────────────────────────────────────────
const decrire = (r) => court(JSON.stringify(r), 80)
export const SONDES = {
  async pause_variable({ fp, importer }) {
    const m = await importer(PA)
    if (typeof m.pauseGenerale !== 'function') return { echecs: [`pauseGenerale n'est pas exportée par ${PA}`] }
    const n0 = fp.appels.length
    const r = await m.pauseGenerale()
    const e = []
    if (!r || r.active !== true || r.source !== 'variable') e.push(`PAUSE_GENERALE=1 : ${decrire(r)}, { active: true, source: 'variable' } attendu`)
    if (fp.appels.length - n0) e.push(`PAUSE_GENERALE=1 : ${fp.appels.length - n0} appel(s) à la base, aucun attendu`)
    return { echecs: e, resume: 'PAUSE_GENERALE=1 → active, source variable, zéro appel' }
  },
  async pause_base({ fp, importer, depuis }) {
    const m = await importer(PA)
    if (typeof m.pauseGenerale !== 'function') return { echecs: [`pauseGenerale n'est pas exportée par ${PA}`] }
    const e = []
    let base = true
    fp.reponses.ops_interrupteur = () => (base === 'erreur' ? { status: 500, body: { code: 'XX000', message: 'panne simulée par le juge', details: null, hint: null } } : { status: 200, body: base })
    const cas = async (quoi, v, att) => {
      base = v
      const n0 = fp.appels.length
      let r
      try { r = await m.pauseGenerale() } catch (x) { r = { exception: String(x.message) } }
      const ap = depuis(n0).filter((a) => a.fonction === 'ops_interrupteur')
      if (!r || r.active !== att.active || (att.source && r.source !== att.source)) e.push(`${quoi} : ${decrire(r)}, ${JSON.stringify(att)} attendu`)
      if (quoi !== 'port fermé' && (ap.length !== 1 || ap[0].params?.p_nom !== 'pause_generale')) e.push(`${quoi} : ops_interrupteur ${ap.length === 1 ? `reçoit p_nom « ${court(ap[0].params?.p_nom, 30)} »` : `appelée ${ap.length} fois`}, une fois avec 'pause_generale' attendu`)
    }
    await cas('base true', true, { active: true, source: 'base' })
    await cas('base false', false, { active: false })
    await cas('base en erreur 500', 'erreur', { active: true, source: 'panne' })
    await fp.arreter()
    await cas('port fermé', true, { active: true, source: 'panne' })
    const fautes = fp.fautes()
    if (fautes.length) e.push(`${fautes.length} appel(s) refusé(s) par le faux PostgREST : ${fautes.slice(0, 3).map((f) => `${f.fonction} (${f.faute})`).join(', ')}`)
    return { echecs: e, resume: 'base true → active (base) ; false → inactive ; erreur 500 → active (panne) ; port fermé → active (panne) ; ops_interrupteur(p_nom = pause_generale)' }
  },
  async pause_post({ fp, J, importer, depuis, lireReponse }) {
    const route = await importer(RT)
    if (typeof route.POST !== 'function') return { pa2: [`POST n'est pas exportée par ${RT}`], pa9: [`POST n'est pas exportée par ${RT}`] }
    fp.reponses.ops_interrupteur = () => ({ status: 200, body: false })
    fp.reponses.ops_interrupteur_poser = () => ({ status: 200, body: null })
    const uid = C.uuid()
    const post = async (corps, { fondateur = 'fondateur', reconf = 'ok', journal = 'ok' } = {}) => {
      J.fondateur = { mode: fondateur, uid }; J.reconfirmation = reconf; J.journal = journal
      const d0 = J.doublures.length, n0 = fp.appels.length
      const rep = await route.POST(new Request('http://127.0.0.1/api/controle/pause', { method: 'POST', headers: { 'content-type': 'application/json', 'x-presti-reconfirmation': 'jeton-du-juge', 'x-forwarded-for': '203.0.113.5' }, body: JSON.stringify(corps) }))
      const l = await lireReponse(rep)
      const ap = depuis(n0)
      return { ...l, poser: ap.filter((a) => a.fonction === 'ops_interrupteur_poser'), fautes: ap.filter((a) => a.faute), journal: J.doublures.slice(d0).filter((d) => d.quoi === 'journal.journaliser') }
    }
    const pa2 = [], pa9 = []
    const bon = { actif: true, motif: 'essai du juge pause-qa' }
    for (const [quoi, corps, o, statut] of [
      ['sans fondateur', bon, { fondateur: 'refus' }, 401],
      ['partenaire en lecture', bon, { fondateur: 'partenaire' }, 403],
      ['reconfirmation absente', bon, { reconf: 'absent' }, 403],
      ['reconfirmation rejouée', bon, { reconf: 'rejoue' }, 403],
      ['motif de 2 signes', { actif: true, motif: 'ab' }, {}, 400],
      ['journal en panne', bon, { journal: 'panne' }, 503],
    ]) {
      const x = await post(corps, o)
      if (x.status !== statut) pa2.push(`${quoi} : HTTP ${x.status}, ${statut} attendu`)
      if (x.poser.length) pa2.push(`${quoi} : ops_interrupteur_poser appelée ${x.poser.length} fois, jamais attendu`)
    }
    const essais = []
    for (const actif of [true, false]) {
      const motif = actif ? 'essai du juge pause-qa' : 'reprise du juge pause-qa'
      const x = await post({ actif, motif })
      essais.push(x)
      if (!(x.status >= 200 && x.status < 300)) pa2.push(`tout bon (actif ${actif}) : HTTP ${x.status} (« ${court(x.texte, 60)} »)`)
      if (x.poser.length !== 1) pa2.push(`tout bon (actif ${actif}) : ops_interrupteur_poser appelée ${x.poser.length} fois, une attendue`)
      else {
        const p = x.poser[0].params || {}
        if (p.p_nom !== 'pause_generale' || p.p_actif !== actif || p.p_motif !== motif || p.p_auteur !== uid) pa2.push(`tout bon (actif ${actif}) : ops_interrupteur_poser reçoit ${court(JSON.stringify(p), 100)} ; p_nom pause_generale, p_actif ${actif}, le motif et p_auteur = uid du fondateur attendus`)
        const j = x.journal.filter((d) => d.ok)
        if (!j.length) pa2.push(`tout bon (actif ${actif}) : rien n'est journalisé`)
        else {
          if (!j.some((d) => d.action === 'pause_generale')) pa2.push(`tout bon (actif ${actif}) : l'action journalisée vaut ${j.map((d) => d.action).join(', ')}, pause_generale attendue`)
          if (!j.some((d) => d.rang < x.poser[0].rang)) pa2.push(`tout bon (actif ${actif}) : ops_interrupteur_poser (rang ${x.poser[0].rang}) avant le journal (rang ${j.map((d) => d.rang).join(', ')})`)
        }
      }
      for (const k of C.cles(x.json)) if (/s[eé]quenceur/i.test(k)) pa9.push(`la réponse du POST (actif ${actif}) porte un champ « ${k} »`)
      if (x.fautes.length) pa2.push(`${x.fautes.length} appel(s) refusé(s) par le faux PostgREST : ${x.fautes.map((f) => `${f.fonction} (${f.faute})`).join(', ')}`)
    }
    return {
      pa2, pa9,
      resume2: 'sans fondateur 401, partenaire 403, reconfirmation absente ou rejouée 403, motif de 2 signes 400, journal en panne 503 : aucun appel à ops_interrupteur_poser ; tout bon (actif true et false) : un appel, p_auteur = uid, après le journal « pause_generale »',
      resume9: `réponses du POST sans champ sequenceur (${essais.map((x) => court(x.texte, 60)).join(' ; ')})`,
    }
  },
  async pause_get({ fp, J, importer, depuis, lireReponse }) {
    const route = await importer(RT)
    if (typeof route.GET !== 'function') return { echecs: [`GET n'est pas exportée par ${RT}`] }
    const e = []
    let base = false
    fp.reponses.ops_interrupteur = () => ({ status: 200, body: base })
    const uid = C.uuid()
    const get = async (mode) => {
      J.fondateur = { mode, uid }
      const d0 = J.doublures.length, n0 = fp.appels.length
      const l = await lireReponse(await route.GET(new Request('http://127.0.0.1/api/controle/pause', { headers: { 'x-forwarded-for': '203.0.113.6' } })))
      return { ...l, appels: depuis(n0), domaines: J.doublures.slice(d0).filter((d) => d.quoi === 'garde.exigerDomaine') }
    }
    for (const v of [false, true]) {
      base = v
      const x = await get('fondateur')
      if (x.status !== 200 || x.json?.active !== v) e.push(`fondateur, base ${v} : HTTP ${x.status}, « ${court(x.texte, 60)} » ; 200 et active: ${v} attendus`)
      if (!x.domaines.some((d) => d.domaine === 'securite')) e.push(`fondateur : exigerDomaine n'est pas appelé sur le domaine securite (${x.domaines.map((d) => `${d.domaine}/${d.verbe}`).join(', ') || 'aucun appel'})`)
    }
    for (const [mode, statut] of [['refus', 401], ['partenaire', 403]]) {
      const x = await get(mode)
      if (x.status !== statut) e.push(`${mode === 'refus' ? 'sans fondateur' : 'partenaire'} : HTTP ${x.status}, ${statut} attendu`)
      if (x.appels.length) e.push(`${mode === 'refus' ? 'sans fondateur' : 'partenaire'} : ${x.appels.length} appel(s) à la base, aucun attendu`)
    }
    return { echecs: e, resume: 'fondateur securite → 200 et l\'état de la base (false puis true) ; sans fondateur 401, partenaire 403, sans appel à la base' }
  },
}

// ── Côté juge ──────────────────────────────────────────────────────────────────────────────────────────────────────
async function jugerPause(racine) {
  const n = nonJuge(racine, [PA, BU], 'PA-1', true)
  if (n) return n
  const a = deSonde(await sonde('pause_variable', racine, {}, { env: { PAUSE_GENERALE: '1' } }))
  const b = deSonde(await sonde('pause_base', racine))
  return res([...a.echecs, ...b.echecs], `${a.resume} ; ${b.resume}`)
}
async function jugerPost(racine, cle) {
  const n = nonJuge(racine, [RT, PA, BU])
  if (n) return n
  const x = await sonde('pause_post', racine)
  return x.ok ? res(x.res[cle] || ['résultat de sonde sans liste'], cle === 'pa2' ? x.res.resume2 : x.res.resume9) : res([x.erreur])
}
async function jugerGet(racine) {
  const n = nonJuge(racine, [RT, PA, BU])
  if (n) return n
  return deSonde(await sonde('pause_get', racine))
}

const blocAction = (t) => { const i = t.indexOf('export type Action ='); if (i < 0) return null; const j = t.indexOf('\n\n', i); return t.slice(i, j < 0 ? t.length : j) }
function corps(t, nom) {
  const i = t.search(new RegExp(`export (async )?function ${nom}\\b|export const ${nom}\\s*=`))
  if (i < 0) return null
  const debut = t.slice(i)
  if (/^export const/.test(debut)) return debut.split('\n')[0]
  const j = debut.indexOf('\n}\n')
  return j < 0 ? debut : debut.slice(0, j + 2)
}
function jugerJournal(racine) {
  const t = C.lire(racine, JN), h = C.aHead(JN)
  if (t === null) return res([`${JN} absent`])
  if (h === null) return res([`${JN} introuvable à HEAD`])
  const e = []
  const bloc = blocAction(t)
  if (!bloc) e.push('le type Action est introuvable')
  else if (!/'pause_generale'/.test(bloc)) e.push('\'pause_generale\' n\'est pas dans le type Action')
  const { ajoutes, retires } = C.diffLignes(h, t)
  const dejaAHead = /'pause_generale'/.test(blocAction(h) || '')
  const seul = (l) => /^\s*\|\s*'pause_generale'\s*$/.test(l)
  const ok = dejaAHead ? !ajoutes.length && !retires.length
    : (!retires.length && ajoutes.length === 1 && seul(ajoutes[0])) || (retires.length === 1 && ajoutes.length === 1 && [ajoutes[0].replace(/\s*\|\s*'pause_generale'/, ''), ajoutes[0].replace(/'pause_generale'\s*\|\s*/, '')].includes(retires[0]))
  if (!ok && (ajoutes.length || retires.length)) e.push(`le diff avec HEAD ne se limite pas à 'pause_generale' dans Action : ${ajoutes.length} ligne(s) ajoutée(s), ${retires.length} retirée(s)${ajoutes.length ? ` (« ${court(ajoutes.find((l) => !seul(l)) ?? ajoutes[0], 60)} »)` : ''}`)
  for (const nom of ['epurer', 'journaliser', 'refusJournal']) { const a = corps(h, nom), b = corps(t, nom); if (a === null) e.push(`${nom} introuvable à HEAD`); else if (a !== b) e.push(`le corps de ${nom} diffère de HEAD`) }
  return res(e, `diff avec HEAD : ${dejaAHead ? 'aucun (déjà à HEAD)' : `${ajoutes.length} ligne ajoutée, ${retires.length} retirée`}, 'pause_generale' dans Action ; epurer, journaliser et refusJournal identiques à HEAD`)
}

// ── La doc ─────────────────────────────────────────────────────────────────────────────────────────────────────────
/** Les parties de la doc : première ligne, voies (items numérotés), ce qui est coupé, ce qui passe, blocs SQL. */
export function lireDoc(t) {
  const L = C.lf(t).split('\n')
  const iTitre = L.findIndex((l) => /^#\s/.test(l))
  const premiere = L.slice(iTitre + 1).find((l) => l.trim()) ?? ''
  const iP = L.findIndex((l) => /laisse(nt)?\s+passer/i.test(l))
  // le début de « ce que la pause coupe » : son titre s'il y en a un, sinon la dernière ligne qui dit « coupe » avant « laisse passer »
  const avantP = iP < 0 ? [] : L.slice(0, iP).map((l, i) => [l, i]).filter(([l, i]) => /\bcoupe\b/i.test(l) && i !== L.indexOf(premiere))
  const iC = (avantP.find(([l]) => /^#{1,6}\s/.test(l)) || avantP.at(-1) || [null, -1])[1]
  let fP = L.length
  if (iP >= 0) for (let i = iP + 1; i < L.length; i++) if (/^#{1,6}\s/.test(L[i])) { fP = i; break }
  const coupe = iC >= 0 && iP > iC ? L.slice(iC + 1, iP).join('\n') : null
  const passe = iP >= 0 ? L.slice(iP + 1, fP).join('\n') : null
  const voies = []
  let cur = null
  for (const l of L) {
    if (/^\d+\.\s/.test(l)) { cur = [l]; voies.push(cur) } else if (cur && (/^\s+\S/.test(l) || !l.trim())) cur.push(l); else if (cur) cur = null
  }
  const sql = [...C.lf(t).matchAll(/```sql\n([\s\S]*?)```/g)].map((m) => m[1])
  return { premiere, coupe, passe, voies: voies.map((v) => v.join('\n')), sql }
}
/** Les énoncés d'un bloc SQL, découpés hors des chaînes, après le tokenizer de sql-nu.mjs. → { enonces, erreur } */
export function enoncesSql(bloc) {
  const nu = sansCommentairesSql(bloc)
  const enonces = []
  let cur = '', dans = false
  for (let i = 0; i < nu.length; i++) {
    const c = nu[i]
    if (c === "'") { if (dans && nu[i + 1] === "'") { cur += "''"; i++; continue } dans = !dans }
    if (c === ';' && !dans) { if (cur.trim()) enonces.push(cur.trim()); cur = '' } else cur += c
  }
  if (dans) return { enonces, erreur: 'chaîne non fermée' }
  if (cur.trim()) enonces.push(cur.trim())
  return { enonces, erreur: null }
}
/** Le texte d'une voie hors de ses blocs de code : ce que la doc DIT, pas ce que le SQL insère. */
const prose = (v) => v.replace(/```[\s\S]*?```/g, '')
const horsChaines = (s) => s.replace(/'(?:[^']|'')*'/g, "''")
const RE_MOTIFS_CLES = [/sk_[A-Za-z0-9_]{8,}/, /eyJ[A-Za-z0-9_-]{10,}/]
function secretsDe(t) {
  const out = RE_MOTIFS_CLES.filter((re) => re.test(t)).map((re) => re.source.slice(0, 4))
  for (const m of t.match(/[A-Za-z0-9_+/=-]{32,}/g) || []) if (/\d/.test(m) && /[A-Za-z]/.test(m) && (/[A-Z]/.test(m) || m.length >= 40)) out.push(`${m.slice(0, 6)}… (${m.length} signes)`)
  return out
}
function jugerDocVoies(racine) {
  const t = C.lire(racine, DOC)
  if (t === null) return res([`non jugé : ${DOC} absent (PA-1)`])
  const d = lireDoc(t), e = []
  if (d.voies.length < 4) e.push(`${d.voies.length} voie(s) numérotée(s), quatre attendues`)
  const voie = (re) => d.voies.find((v) => re.test(v))
  if (!voie(/station/i)) e.push('la voie de la station manque')
  if (!voie(/Telegram/)) e.push('la voie du pont Telegram manque')
  if (!voie(/Claude Code/) || !voie(/execute_sql/)) e.push('la voie de Claude Code par execute_sql manque')
  const vercel = voie(/Vercel/)
  if (!vercel) e.push('la voie de la variable Vercel manque')
  else {
    if (!/PAUSE_GENERALE/.test(vercel)) e.push('la voie Vercel ne nomme pas PAUSE_GENERALE')
    if (!/red[ée]ploiement/i.test(vercel)) e.push('la voie Vercel ne dit pas « redéploiement »')
  }
  if (/PRESTI_PAUSE_AGENTS/.test(t)) e.push('la doc nomme PRESTI_PAUSE_AGENTS')
  if (d.coupe === null || d.passe === null) e.push('les listes « ce que la pause coupe » et « ce qu\'elle laisse passer » sont introuvables')
  else {
    if (/\benvoye\b/.test(d.coupe)) e.push('`envoye` est cité dans ce que la pause coupe')
    if (!/\benvoye\b/.test(d.passe) || !/jamais\s+refus/i.test(d.passe)) e.push('ce que la pause laisse passer ne dit pas que le passage à `envoye` n\'est jamais refusé')
  }
  if (!d.sql.length) e.push('aucun bloc ```sql```')
  let upd = 0, ins = 0
  for (const b of d.sql) {
    const { enonces, erreur } = enoncesSql(b)
    if (erreur) { e.push(`bloc SQL illisible : ${erreur}`); continue }
    for (const s of enonces) {
      const x = horsChaines(s).replace(/\s+/g, ' ').trim()
      if (/\b(delete|drop|grant|alter|truncate|revoke)\b/i.test(x)) e.push(`le bloc SQL contient « ${court(x, 60)} »`)
      else if (/^update ops\.interrupteurs set .+ where nom = ''$/i.test(x) && /where\s+nom\s*=\s*'pause_generale'\s*$/i.test(s.replace(/\s+/g, ' '))) upd++
      else if (/^insert into ops\.evenements\b/i.test(x)) ins++
      else e.push(`énoncé SQL hors de l'update de ops.interrupteurs (pause_generale) et de l'insert dans ops.evenements : « ${court(x, 70)} »`)
      for (const m of x.match(/\b\w+\.\w+\b/g) || []) if (/^ops\./i.test(m) && !/^ops\.(interrupteurs|evenements)$/i.test(m)) e.push(`le bloc SQL touche ${m}`)
    }
  }
  if (d.sql.length && (!upd || !ins)) e.push(`le bloc SQL porte ${upd} update de ops.interrupteurs et ${ins} insert dans ops.evenements, un de chaque attendu`)
  const s = secretsDe(t)
  if (s.length) e.push(`chaîne(s) qui ressemble(nt) à un secret : ${s.slice(0, 3).join(', ')}`)
  return res(e, `quatre voies (station, pont Telegram, Claude Code par execute_sql, PAUSE_GENERALE puis redéploiement) ; \`envoye\` jamais refusé, absent de ce qui est coupé ; SQL : ${upd} update de ops.interrupteurs (pause_generale), ${ins} insert dans ops.evenements, rien d'autre ; aucun secret`)
}
function jugerDocListes(racine) {
  const t = C.lire(racine, DOC)
  if (t === null) return res([`non jugé : ${DOC} absent (PA-1)`])
  const d = lireDoc(t), e = []
  const p = d.premiere
  for (const [re, quoi] of [[/dans la minute/i, 'dans la minute'], [/Facteur/, 'le Facteur'], [/R[ée]pondeur/, 'le Répondeur'], [/r[ée]ponses Meta/i, 'les réponses Meta'], [/porteur/i, 'le porteur'], [/travail/, 'sa route travail']]) if (!re.test(p)) e.push(`la première ligne après le titre ne dit pas ${quoi} (« ${court(p, 70)} »)`)
  if (/s[ée]quenceur/i.test(t)) e.push('la doc parle du séquenceur')
  if (/campagnes/i.test(t)) e.push('la doc parle de campagnes')
  if (d.coupe === null || d.passe === null) e.push('les listes « ce que la pause coupe » et « ce qu\'elle laisse passer » sont introuvables')
  else {
    for (const [re, quoi] of [[/Facteur/, 'Facteur'], [/porteur/i, 'porteur'], [/R[ée]pondeur/, 'Répondeur'], [/r[ée]ponses priv[ée]es/i, 'réponses privées'], [/messagerie/i, 'messagerie'], [/Crieur/, 'Crieur']]) if (!re.test(d.coupe)) e.push(`ce que la pause coupe ne cite pas ${quoi}`)
    const pub = d.coupe.split('\n').filter((l) => /Publora/.test(l)).join(' ')
    if (!/partent/i.test(pub) || !/retir\w*\s+dans\s+Publora/i.test(pub)) e.push('ce que la pause coupe ne dit pas que ce qui est programmé dans Publora part et se retire dans Publora')
    if (/r[ée]ception/i.test(d.coupe)) e.push('ce que la pause coupe cite la réception')
    if (!/r[ée]ception/i.test(d.passe)) e.push('ce que la pause laisse passer ne cite pas la réception')
    if (!/opposition/i.test(d.passe) || !/\bSTOP\b/.test(d.passe)) e.push('ce que la pause laisse passer ne cite pas l\'opposition d\'un STOP')
    if (!/commandes pay[ée]es/i.test(d.passe) || !/livr/i.test(d.passe)) e.push('ce que la pause laisse passer ne cite pas la livraison des commandes payées')
  }
  const sql = d.voies.find((v) => /execute_sql|```sql/.test(v))
  if (!sql || !/Claude Code/.test(prose(sql))) e.push('la voie SQL ne dit pas que Claude Code l\'exécute')
  return res(e, 'première ligne (dans la minute : Facteur, Répondeur, réponses Meta, porteur, route travail) ; ni séquenceur ni campagnes ; coupé : Facteur, porteur, Répondeur, réponses privées, messagerie, Crieur, Publora ; passe : réception, opposition d\'un STOP, livraison des commandes payées ; voie SQL par Claude Code')
}
function jugerDocVoiesSql(racine) {
  const t = C.lire(racine, DOC)
  if (t === null) return res([`non jugé : ${DOC} absent (PA-1)`])
  const d = lireDoc(t), e = []
  if (/SQL Editor/i.test(t)) e.push('la doc cite le SQL Editor')
  const colle = t.match(/\bcoll(er|ez|ée|ee)\b/gi)
  if (colle) e.push(`la doc dit « ${colle[0]} »`)
  const sql = d.voies.find((v) => /execute_sql|```sql/.test(v))
  if (!sql || !/Claude Code/.test(prose(sql)) || !/execute_sql/.test(prose(sql))) e.push('la voie SQL ne nomme pas Claude Code et execute_sql')
  const pont = d.voies.find((v) => /Telegram/.test(v))
  if (!pont || !/\/pause\b/.test(pont)) e.push('la voie du pont ne nomme pas /pause')
  else if (!/ne la l[èe]ve jamais|jamais lev/i.test(pont)) e.push('la voie du pont ne dit pas qu\'elle ne lève jamais la pause')
  if (d.sql.some((b) => /urgence SQL Editor/i.test(b))) e.push('le bloc SQL porte encore « urgence SQL Editor »')
  if (!d.sql.some((b) => /'urgence execute_sql'/.test(b))) e.push('le bloc SQL ne porte pas motif = \'urgence execute_sql\'')
  return res(e, 'ni SQL Editor ni coller ; voie SQL : Claude Code et execute_sql ; voie du pont : /pause, ne la lève jamais ; motif \'urgence execute_sql\'')
}

function jugerSources(racine) {
  const e = []
  for (const rel of [PA, RT]) {
    const t = C.lire(racine, rel)
    if (t === null) { e.push(`non jugé : ${rel} absent (PA-1)`); continue }
    for (const [re, quoi] of [[/\bfetch\s*\(/, 'fetch('], [/s[eé]quenceur/i, 'sequenceur'], [/lemlist/i, 'lemlist'], [/instantly/i, 'instantly'], [/lib\/agents\/acquisition/, 'lib/agents/acquisition']]) if (re.test(t)) e.push(`${rel} contient ${quoi}`)
  }
  return res(e, 'pause.ts et la route : ni fetch(, ni sequenceur, ni lemlist, ni instantly, ni lib/agents/acquisition')
}
async function jugerSansSequenceur(racine) {
  const s = jugerSources(racine)
  if (s.echecs.some((x) => x.startsWith('non jugé'))) return s
  const p = await jugerPost(racine, 'pa9')
  return res([...p.echecs, ...s.echecs], `${p.resume} ; ${s.resume}`)
}

async function jugerTypecheck(racine) {
  const n = nonJuge(racine, [PA, RT])
  if (n) return n
  return C.typecheck(JUGE, racine, [PA, RT])
}
async function jugerReel() {
  const e = []
  const url = 'https://prestiapp.fr/api/controle/pause'
  const g = await fetch(url, { redirect: 'manual' }).catch((x) => ({ status: `erreur ${x.message}` }))
  if (![401, 404].includes(g.status)) e.push(`GET sans session : ${g.status}, 401 ou 404 attendu`)
  const p = await fetch(url, { method: 'POST', redirect: 'manual', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ actif: false, motif: 'essai sans session du juge' }) }).catch((x) => ({ status: `erreur ${x.message}` }))
  if (!(typeof p.status === 'number' && p.status >= 400 && p.status < 500)) e.push(`POST sans session : ${p.status}, un refus 4xx attendu`)
  return res(e, `GET sans session ${g.status}, POST sans session ${p.status} ; l'interrupteur de production n'est jamais basculé`)
}

// ── Les sabotages du témoin ────────────────────────────────────────────────────────────────────────────────────────
const secret = () => ['s', 'k', '_', 'live_'].join('') + C.hasard(24) + 'Ab9'
export const SABOTAGES = [
  { id: 'PA-1', nom: 'variable ignorée', fichier: PA, chercher: "process.env.PAUSE_GENERALE === '1'", remplacer: "process.env.PAUSE_GENERALE === 'oui'" },
  { id: 'PA-1', nom: 'variable qui interroge la base', fichier: PA, chercher: "  if (process.env.PAUSE_GENERALE === '1')", remplacer: "  await ops_interrupteur({ p_nom: 'pause_generale' })\n  if (process.env.PAUSE_GENERALE === '1')" },
  { id: 'PA-1', nom: 'panne = inactive', fichier: PA, chercher: "if (!r.ok) return { active: true, source: 'panne' }", remplacer: "if (!r.ok) return { active: false, source: 'panne' }" },
  { id: 'PA-1', nom: 'mauvais interrupteur', fichier: PA, chercher: "ops_interrupteur({ p_nom: 'pause_generale' })", remplacer: "ops_interrupteur({ p_nom: 'pause' })" },
  { id: 'PA-2', nom: 'reconfirmation oubliée', fichier: RT, chercher: '  if (refus) return refus\n', remplacer: '' },
  { id: 'PA-2', nom: 'partenaire accepté', fichier: RT, chercher: "exigerDomaine(f, 'securite', 'ecrire')", remplacer: "exigerDomaine(f, 'journal', 'voir')" },
  { id: 'PA-2', nom: 'motif non borné', fichier: RT, chercher: 'motif.length < 3', remplacer: 'motif.length < 1' },
  { id: 'PA-2', nom: 'journal ignoré', fichier: RT, chercher: '  if (!journal) return refusJournal()\n', remplacer: '' },
  { id: 'PA-2', nom: 'écriture avant le journal', fichier: RT, chercher: '  const avant = await pauseGenerale()', remplacer: "  await ops_interrupteur_poser({ p_nom: 'pause_generale', p_actif: b.actif, p_motif: motif, p_auteur: f.uid })\n  const avant = await pauseGenerale()" },
  { id: 'PA-2', nom: 'auteur fixe', fichier: RT, chercher: 'p_auteur: f.uid })\n  if (!r.ok)', remplacer: "p_auteur: '00000000-0000-4000-8000-000000000000' })\n  if (!r.ok)" },
  { id: 'PA-2', nom: 'action mal nommée', fichier: RT, chercher: "action: 'pause_generale'", remplacer: "action: 'reglage_modifie'" },
  { id: 'PA-3', nom: 'GET sans garde', fichier: RT, chercher: "  const f = await estFondateur(req)\n  if (estRefus(f)) return reponseRefus(f)\n  const p = exigerDomaine(f, 'securite', 'voir')\n  if (domaineRefuse(p)) return reponseRefus(p)\n  return NextResponse.json(await pauseGenerale())", remplacer: '  return NextResponse.json(await pauseGenerale())' },
  { id: 'PA-3', nom: 'GET qui lit la base avant la garde', fichier: RT, chercher: "export async function GET(req: Request) {\n  const f = await estFondateur(req)", remplacer: 'export async function GET(req: Request) {\n  const etat = await pauseGenerale()\n  const f = await estFondateur(req)' },
  { id: 'PA-3', nom: 'GET à l\'état figé', fichier: RT, chercher: "  if (domaineRefuse(p)) return reponseRefus(p)\n  return NextResponse.json(await pauseGenerale())", remplacer: "  if (domaineRefuse(p)) return reponseRefus(p)\n  return NextResponse.json({ active: false, source: 'base' })" },
  { id: 'PA-4', nom: 'journaliser modifié', fichier: JN, chercher: "error.message); return false }", remplacer: "error.message); return true }" },
  { id: 'PA-4', nom: 'action absente', fichier: JN, chercher: "\n  | 'pause_generale'", remplacer: '' },
  { id: 'PA-4', nom: 'deux actions ajoutées', fichier: JN, chercher: "\n  | 'pause_generale'", remplacer: "\n  | 'pause_generale'\n  | 'pause_levee'" },
  { id: 'PA-5', nom: 'Vercel sans redéploiement', fichier: DOC, chercher: 'puis un redéploiement', remplacer: 'aussitôt' },
  { id: 'PA-5', nom: 'ancien nom de variable', fichier: DOC, chercher: '`PAUSE_GENERALE=1`', remplacer: '`PRESTI_PAUSE_AGENTS=1`' },
  { id: 'PA-5', nom: 'envoye dans ce qui est coupé', fichier: DOC, chercher: '- le Répondeur : aucune', remplacer: '- le passage à `envoye` : la base le refuse ;\n- le Répondeur : aucune' },
  { id: 'PA-5', nom: 'SQL qui efface', fichier: DOC, chercher: "   insert into ops.evenements", remplacer: "   delete from ops.evenements where type = 'interrupteur';\n   insert into ops.evenements" },
  { id: 'PA-5', nom: 'SQL hors des deux tables', fichier: DOC, chercher: "   insert into ops.evenements", remplacer: "   update ops.agents set en_pause = true where nom = 'pause_generale';\n   insert into ops.evenements" },
  { id: 'PA-5', nom: 'secret dans la doc', fichier: DOC, chercher: '## Ce que la pause coupe', get remplacer() { return `Clé de secours : ${secret()}\n\n## Ce que la pause coupe` } },
  { id: 'PA-5', nom: 'voie Telegram absente', fichier: DOC, chercher: 'Le pont Telegram', remplacer: 'Le pont' },
  { id: 'PA-5', nom: 'chaîne SQL non fermée', fichier: DOC, chercher: "motif = 'urgence execute_sql',", remplacer: "motif = 'urgence execute_sql," },
  { id: 'PA-8', nom: 'séquenceur revenu', fichier: DOC, chercher: '- le Répondeur : aucune', remplacer: '- la file du séquenceur ;\n- le Répondeur : aucune' },
  { id: 'PA-8', nom: 'Crieur oublié', fichier: DOC, chercher: /^- le Crieur : .*$/m, remplacer: '- les publications.' },
  { id: 'PA-8', nom: 'réception coupée', fichier: DOC, chercher: '- le Répondeur : aucune', remplacer: '- la réception des réponses ;\n- le Répondeur : aucune' },
  { id: 'PA-8', nom: 'première ligne muette', fichier: DOC, chercher: /^La pause arrête dans la minute .*$/m, remplacer: 'Ce document décrit la pause générale.' },
  { id: 'PA-8', nom: 'Publora non dit', fichier: DOC, chercher: 'partent quand même : pour les arrêter, les retirer dans Publora', remplacer: 'sont annulées' },
  { id: 'PA-8', nom: 'opposition oubliée', fichier: DOC, chercher: /^- l'opposition d'un STOP.*\n/m, remplacer: '' },
  { id: 'PA-8', nom: 'livraison oubliée', fichier: DOC, chercher: /^- les commandes payées et leur livraison.*\n/m, remplacer: '' },
  { id: 'PA-9', nom: 'champ sequenceur dans la réponse', fichier: RT, chercher: 'NextResponse.json({ ok: true, pause: await pauseGenerale() })', remplacer: 'NextResponse.json({ ok: true, pause: await pauseGenerale(), file: { sequenceur: null } })' },
  { id: 'PA-9', nom: 'appel réseau dans pause.ts', fichier: PA, chercher: 'export type EtatPause', remplacer: "export const prevenir = () => fetch('http://127.0.0.1:9/')\nexport type EtatPause" },
  { id: 'PA-9', nom: 'acquisition importée', fichier: RT, chercher: "export const runtime = 'nodejs'", remplacer: "const LOT = 'lib/agents/acquisition'\nexport const runtime = 'nodejs'" },
  { id: 'PA-10', nom: 'SQL Editor revenu', fichier: DOC, chercher: 'Benj n\'écrit ni n\'exécute aucun SQL.', remplacer: 'En dernier recours, la coller dans le SQL Editor.' },
  { id: 'PA-10', nom: 'voie SQL sans Claude Code', fichier: DOC, chercher: /Claude Code l'exécute par `execute_sql` \(connecteur Supabase\), sur l'ordre de Benj, donné dans la conversation ou par Remote Control de Claude Code/, remplacer: "on l'exécute par `execute_sql` (connecteur Supabase), sur l'ordre de Benj" },
  { id: 'PA-10', nom: 'pont qui lève la pause', fichier: DOC, chercher: 'ne la lève jamais', remplacer: 'peut aussi la lever' },
  { id: 'PA-10', nom: 'motif SQL Editor', fichier: DOC, chercher: "'urgence execute_sql'", remplacer: "'urgence SQL Editor'" },
]

/** lib/direction/journal.ts du témoin : celui de HEAD, avec 'pause_generale' ajouté au type Action (s'il n'y est pas déjà). */
export function journalDerive(h) {
  if (/'pause_generale'/.test(blocAction(h) || '')) return h
  const L = h.split('\n')
  const i = L.findIndex((l) => /^export type Action =/.test(l))
  if (i < 0) throw new Error('type Action introuvable à HEAD')
  let j = i + 1
  while (j < L.length && (/^\s*\|/.test(L[j]) || /^\s*\/\//.test(L[j]))) j++
  while (j > i + 1 && /^\s*\/\//.test(L[j - 1])) j--
  L.splice(j, 0, "  | 'pause_generale'")
  return L.join('\n')
}

export const CRITERES = {
  'PA-1': { juger: jugerPause },
  'PA-2': { juger: (r) => jugerPost(r, 'pa2') },
  'PA-3': { juger: jugerGet },
  'PA-4': { juger: async (r) => jugerJournal(r) },
  'PA-5': { juger: async (r) => jugerDocVoies(r) },
  'PA-6': { juger: jugerTypecheck, temoin: async (r) => C.eprouverLectureTypecheck(r, [PA, RT]) },
  'PA-7': { juger: jugerReel, reel: true },
  'PA-8': { juger: async (r) => jugerDocListes(r) },
  'PA-9': { juger: jugerSansSequenceur },
  'PA-10': { juger: async (r) => jugerDocVoiesSql(r) },
}

async function principal() {
  const o = C.lireOptions(process.argv.slice(2), JUGE)
  await C.derouler({
    juge: JUGE, ids: IDS, criteres: CRITERES, sabotages: SABOTAGES, o,
    temoin: { attendus: [PA, RT, DOC, BU], derives: [[JN, journalDerive]] },
    prealables: [C.autoControleFauxPostgrest],
  })
}
const pareil = (a, b) => (process.platform === 'win32' ? a.toLowerCase() === b.toLowerCase() : a === b)
if (process.argv[1] && pareil(path.resolve(process.argv[1]), FICHIER)) await principal()
