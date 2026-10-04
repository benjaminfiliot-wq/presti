// UP-1 (les sept fichiers) et UP-10 (les deux unités systemd, lues par un analyseur INI) de usine-pubs-qa (026-199).
import { FICHIERS, existe, taille, lire, ini, court } from '../commun.mjs'

const EXEC_ATTENDU = '/usr/bin/node scripts/usine/avec-coffre.mjs PRESTI_JETON_STUDIO -- /usr/bin/node --import ./scripts/ts-loader.mjs scripts/usine/pubs.mjs --une-passe'
const GO = 1024 ** 3

/** UP-1 : les fichiers existent et portent du texte. Rend true si tous sont là (les autres parties en dépendent). */
export function jouerFichiers({ racine, s }) {
  const manquants = [], vides = []
  for (const f of FICHIERS) {
    if (!existe(racine, f)) { manquants.push(f); continue }
    const t = lire(racine, f)
    if (taille(racine, f) <= 0 || !t || t.replace(/\s+/g, '').length < 20) vides.push(f)
  }
  if (manquants.length || vides.length) {
    s.echoue('UP-1', `${manquants.length ? `absent(s) : ${manquants.join(', ')}` : ''}${manquants.length && vides.length ? ' ; ' : ''}${vides.length ? `vide(s) : ${vides.join(', ')}` : ''}`)
    return false
  }
  s.passe('UP-1', `les ${FICHIERS.length} fichiers existent et ne sont pas vides`)
  return true
}

/** Une taille systemd (« 4G », « 4096M », « 4294967296 ») en octets ; null si illisible ou « infinity ». */
export function octets(v) {
  const m = /^(\d+(?:\.\d+)?)\s*([KMGT])?B?$/i.exec(String(v).trim())
  if (!m) return null
  return Number(m[1]) * (m[2] ? { K: 1024, M: 1024 ** 2, G: GO, T: GO * 1024 }[m[2].toUpperCase()] : 1)
}
/** « 15min », « 15m », « 900s », « 900 » → secondes ; null sinon. */
export function secondes(v) {
  const m = /^(\d+)\s*(s|sec|second|seconds|m|min|minute|minutes)?$/i.exec(String(v).trim())
  if (!m) return null
  return Number(m[1]) * (!m[2] || /^s/i.test(m[2]) ? 1 : 60)
}
/** Un OnCalendar qui tombe toutes les 15 minutes, jour et heure quelconques : *:0/15, *:00/15, *:0,15,30,45, *-*-* *:0/15:00… */
export function toutesLes15Min(v) {
  const t = String(v).trim().replace(/^\*-\*-\*\s+/, '')
  const m = /^\*:([0-9,/]+)(?::(?:0|00))?$/.exec(t)
  if (!m) return false
  const champ = m[1]
  if (/^0?0?\/15$/.test(champ) || champ === '0/15') return true
  const valeurs = champ.split(',').map(Number)
  return valeurs.length === 4 && [0, 15, 30, 45].every((x) => valeurs.includes(x))
}

export function jouerUnites({ racine, s }) {
  const ko = [], ok = []
  const v = (cond, bien, mal) => (cond ? ok.push(bien) : ko.push(mal))
  const brutS = lire(racine, 'scripts/usine/systemd/presti-pubs.service'), brutT = lire(racine, 'scripts/usine/systemd/presti-pubs.timer')
  if (brutS === null || brutT === null) { s.echoue('UP-10', `unité absente : ${brutS === null ? 'presti-pubs.service' : ''} ${brutT === null ? 'presti-pubs.timer' : ''}`.trim()); return }
  const S = ini(brutS), T = ini(brutT)
  const un = (sec, cle) => (sec?.[cle] ?? [])
  const service = S.Service ?? {}
  v(un(service, 'User').join() === 'agents', 'User=agents', `User=${un(service, 'User').join('|') || '(absent)'} (agents attendu)`)
  v(un(service, 'WorkingDirectory').join() === '/srv/presti-agents', 'WorkingDirectory=/srv/presti-agents', `WorkingDirectory=${un(service, 'WorkingDirectory').join('|') || '(absent)'} (/srv/presti-agents attendu)`)
  const env = un(service, 'Environment').flatMap((l) => l.split(/\s+/)).map((x) => x.replace(/^"|"$/g, ''))
  v(env.includes('CODEX_LANCEUR=/usr/local/bin/presti-ia-modele'), 'Environment=CODEX_LANCEUR=/usr/local/bin/presti-ia-modele', `Environment sans CODEX_LANCEUR=/usr/local/bin/presti-ia-modele (reçu : ${court(env.join(' '), 100) || 'rien'})`)
  const fichiersEnv = Object.values(S).flatMap((sec) => Object.keys(sec)).filter((k) => /^EnvironmentFile$/i.test(k))
  v(fichiersEnv.length === 0, 'aucun EnvironmentFile=', 'EnvironmentFile= présent : il chargerait tout le coffre')
  const mm = un(service, 'MemoryMax'), mo = mm.length === 1 ? octets(mm[0]) : null
  v(mo !== null && mo > 0 && mo <= 4 * GO, `MemoryMax=${mm[0]} (4G au plus)`, `MemoryMax=${mm.join('|') || '(absent)'} (une valeur finie de 4G au plus attendue)`)
  v(un(service, 'Nice').join() === '10', 'Nice=10', `Nice=${un(service, 'Nice').join('|') || '(absent)'} (10 attendu)`)
  const ex = un(service, 'ExecStart')
  v(ex.length === 1 && ex[0].replace(/\s+/g, ' ') === EXEC_ATTENDU, 'ExecStart : avec-coffre.mjs PRESTI_JETON_STUDIO -- … scripts/usine/pubs.mjs --une-passe', `ExecStart = « ${court(ex.join(' | ') || '(absent)', 200)} » ; attendu « ${EXEC_ATTENDU} »`)
  v(!/PRESTI_JETON_LIVREUR_USINE/.test(brutS) && /PRESTI_JETON_STUDIO/.test(brutS), 'PRESTI_JETON_STUDIO seul : PRESTI_JETON_LIVREUR_USINE absent de l\'unité', brutS.includes('PRESTI_JETON_LIVREUR_USINE') ? 'PRESTI_JETON_LIVREUR_USINE figure encore dans l\'unité (l\'identité des pubs est studio)' : 'PRESTI_JETON_STUDIO absent de l\'unité')
  // l'unité doit pouvoir démarrer : avec-coffre.mjs refuse (code 2, rien n'est lancé) un nom hors de la liste fermée de coffre-regles.mjs
  const regles = lire(racine, 'scripts/usine/coffre-regles.mjs')
  const bloc = regles ? /NOMS_PERMIS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/.exec(regles)?.[1] ?? '' : ''
  const permis = [...bloc.matchAll(/['"]([A-Z0-9_]+)['"]/g)].map((m) => m[1])
  v(permis.includes('PRESTI_JETON_STUDIO'), 'PRESTI_JETON_STUDIO est dans la liste fermée du coffre (avec-coffre.mjs lance l\'unité)', regles === null ? 'scripts/usine/coffre-regles.mjs introuvable' : 'PRESTI_JETON_STUDIO est absent de NOMS_PERMIS (scripts/usine/coffre-regles.mjs) : avec-coffre.mjs refuserait de lancer l\'unité (code 2) et usine-coffre.mjs de poser le jeton')
  // le minuteur
  const timer = T.Timer ?? {}, cal = un(timer, 'OnCalendar'), actif = un(timer, 'OnUnitActiveSec')
  const quinze = (cal.length >= 1 && cal.every(toutesLes15Min)) || (cal.length === 0 && actif.length === 1 && secondes(actif[0]) === 900)
  v(quinze, `minuteur toutes les 15 min (${cal.join(', ') || actif.join(', ')})`, `minuteur : OnCalendar=${cal.join('|') || '(absent)'}${actif.length ? `, OnUnitActiveSec=${actif.join('|')}` : ''} (toutes les 15 min attendu)`)
  v(un(timer, 'Persistent').join().toLowerCase() === 'true', 'Persistent=true', `Persistent=${un(timer, 'Persistent').join('|') || '(absent)'} (true attendu)`)
  const cible = un(timer, 'Unit')
  v(cible.length === 0 || cible.join() === 'presti-pubs.service', '', `Unit=${cible.join('|')} (presti-pubs.service attendu)`)
  v(un(T.Install ?? {}, 'WantedBy').join() === 'timers.target', '[Install] WantedBy=timers.target', `[Install] WantedBy=${un(T.Install ?? {}, 'WantedBy').join('|') || '(absent)'} (timers.target attendu : sans lui, enable ne démarre rien)`)
  if (ko.length) s.echoue('UP-10', ko.slice(0, 4).join(' ; ') + (ko.length > 4 ? ` (+${ko.length - 4})` : ''))
  else s.passe('UP-10', ok.slice(0, 6).join(' ; '))
}
