#!/usr/bin/env node
// Doublure de ~/veille/conseil.mjs pour scripts/usine-relais-qa.mjs, choisie par PRESTI_CONSEIL_BIN. Aucun réseau.
// Mêmes arguments que le vrai : --verdict=<f> --journal=<f> --consigne=<f> [--prive]. Chaque appel est noté dans
// BANC_JOURNAL (arguments, --prive, présence de FL_KEY, début des fichiers lus, pid).
// BANC_CONSEIL : ok (un conseil court, marqué MARQUEUR-CONSEIL-BANC) · plante (exception, code 1) · lent (dort 200 s :
// doit être tué par la borne de 90 s) · long (10 000 signes : doit être coupé à 4 000) · vide (rien) · aucune (la phrase du
// vrai conseil.mjs quand aucune IA ne répond).
import fs from 'node:fs'

const A = Object.fromEntries(process.argv.slice(2).map((a) => { const s = a.replace(/^--/, ''); const i = s.indexOf('='); return i < 0 ? [s, true] : [s.slice(0, i), s.slice(i + 1)] }))
const lire = (p) => { try { return fs.readFileSync(p, 'utf8') } catch { return null } }
const journal = process.env.BANC_JOURNAL
const noter = (o) => { if (journal) fs.appendFileSync(journal, JSON.stringify({ qui: 'conseil', t: Date.now(), pid: process.pid, ...o }) + '\n') }
const mode = process.env.BANC_CONSEIL || 'ok'
const verdict = lire(A.verdict)
const journalCodex = lire(A.journal)
noter({
  etape: 'debut', mode, argv: process.argv.slice(2), prive: A.prive === true, flKey: process.env.FL_KEY ?? null,
  verdictLu: verdict === null ? null : verdict.slice(0, 400), journalSignes: journalCodex === null ? null : journalCodex.length,
  journalDebut: journalCodex === null ? null : journalCodex.slice(0, 200), consigne: A.consigne || null, consigneExiste: !!(A.consigne && fs.existsSync(A.consigne)),
  // Ce que le conseiller enverrait à une IA : contient-il une clé ? (BANC_CLE_A_GUETTER, posée par le banc : la clé factice)
  cleVue: !!(process.env.BANC_CLE_A_GUETTER && [verdict, journalCodex].some((t) => t && t.includes(process.env.BANC_CLE_A_GUETTER))),
  journalMasque: !!(journalCodex && journalCodex.includes('[clé freellmapi retirée]')),
})

if (mode === 'plante') throw new Error('panne simulée du conseiller (doublure)')
if (mode === 'vide') process.exit(0)
if (mode === 'aucune') { console.log('CONSEIL : aucune IA relectrice disponible pour ce tour.'); process.exit(0) }
if (mode === 'lent') {
  setTimeout(() => { noter({ etape: 'fini-malgre-la-borne' }); console.log('CONSEIL tardif (ne doit jamais arriver)') }, 200_000)
} else if (mode === 'long') {
  console.log("CONSEIL D'UNE AUTRE IA (doublure) :\nMARQUEUR-CONSEIL-BANC " + 'é'.repeat(10_000) + ' FIN-JAMAIS-VUE')
} else {
  console.log("CONSEIL D'UNE AUTRE IA (doublure) :\n1. MARQUEUR-CONSEIL-BANC — critère BANC-2 : ajoute la ligne « total » à la fin de scripts/banc-relais.mjs, puis relance le juge.")
}
