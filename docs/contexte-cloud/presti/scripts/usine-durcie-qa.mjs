#!/usr/bin/env node
// scripts/usine-durcie-qa.mjs — le juge du durcissement de l'usine (fiche 026-194, écrit par Claude Code AVANT la production 026-197).
//
//   node scripts/usine-durcie-qa.mjs [--racine=<dossier>] [--reel] [--temoin] [--preuve-echecs]
//
//   UD-1   scripts/usine/durcir.sh existe, commence par « #!/usr/bin/env bash » puis « set -euo pipefail » ;
//   UD-2   durcir.sh LU et EXÉCUTÉ dans un faux système de fichiers (`bash durcir.sh --racine-systeme=<dossier d'essai> "<clé publique>"`,
//          doublures de visudo, gpasswd, useradd, systemctl, findmnt, install, id, sudo… en tête du PATH, qui consignent leurs appels).
//          Quatre états : frais (NFS absent), second passage, frais avec NFS monté, déjà durci (gardien existant, règle déjà retirée).
//            UD-2a sudoers : chaque fichier posé l'est par fichier temporaire, `visudo -cf` PUIS `install -m 440` (jamais en place) ;
//            UD-2b 90-cloud-init-users : seule la ligne « usine ALL=(ALL) NOPASSWD:ALL » retirée, le reste à l'octet ;
//            UD-2c presti-agents et presti-chef-modele* jamais touchés (contenu, mode, date) ;
//            UD-2d `gpasswd -d usine sudo` et `gpasswd -d usine docker` (et rien d'autre dans /etc/group) ;
//            UD-2e gardien créé seulement s'il manque, authorized_keys en 600 avec la seule clé passée en argument, presti-gardien ;
//            UD-2f aucun ufw, aucune écriture iptables, aucun apt remove (lu ET constaté) ;
//            UD-2g rpcbind désactivé seulement si `findmnt -t nfs,nfs4` est vide (les deux cas essayés) ;
//            UD-2h idempotence : un second passage ne change rien à l'octet et le dit ; gardien existant et règle déjà retirée acceptés ;
//            UD-2i le script s'exécute (code 0 aux quatre passages), sans chemin système en dur, sans toucher au vrai système ;
//          l'id de tête UD-2 est rouge dès qu'une de ces lignes l'est.
//   UD-3   scripts/usine.mjs : la préparation n'exige plus `sudo -n true` du compte usine ;
//            UD-3a lu : aucun `sudo -n true` dans le code ; UD-3b lu : le script envoyé à usine n'appelle pas `--with-deps` (qui lance sudo)
//            ni un sudo de commande ; UD-3c essayé : `usine.mjs preparer` sur une doublure de ssh (PRESTI_USINE=[EMAIL_MASQUE], HOME et
//            PATH d'essai) qui EXÉCUTE le script reçu sous un compte usine sans aucun sudo : code 0 attendu.
//   UD-R   (--reel, sur le poste) : l'usine, en lecture seule ; préalable manquant (clé absente, hôte injoignable) → code 2.
//   --temoin         non-régression seulement tant que 026-197 n'est pas dans fait/ (package.json et lock identiques à HEAD, typecheck vert) ;
//                    une fois livrée, le juge tourne pour de vrai ;
//   --preuve-echecs  sur l'arbre courant : code ≠ 0 avec UD-1 en échec en premier, puis --temoin en code 0 ; écrit sa section d'echecs-attendus.md.
// Sortie : `PASS|FAIL|SAUTE <critère> — …`, puis « usine-durcie-qa : PASS|FAIL — … ». Code 0 (tout vert), 1 (un critère en échec),
// 2 (appel invalide, préalable manquant). N'écrit que sous .orchestre/travail/usine-durcie-qa/ et .orchestre/preuves/026-194/ ; aucun réseau
// hors --reel ; aucune clé réelle (les clés publiques d'essai sont tirées au hasard à chaque passage).
process.env.TZ = 'UTC'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { creerRapport } from './lib/sql-essai.mjs'
import { R, TRAVAIL, existe, lire, lireSi, court, lf, lireOptions, lancer, ficheLivree, ecrireSectionEchecs, nonRegression } from './fixtures/026-transverse/commun.mjs'
import { LIGNE_USINE, LIGNE_GARDIEN, FICHIERS_INTACTS, sha, fixture, tirerClePublique, attendu90, attenduGroup, creerFauxSysteme, instantane, difference, ecrireDoublures, lireJournal, ecrireDoublesSsh } from './fixtures/026-transverse/usine-commun.mjs'

const NOM = 'usine-durcie-qa'
const CE = fileURLToPath(import.meta.url)
const o = lireOptions(process.argv.slice(2), ['racine', 'reel', 'temoin', 'preuve-echecs'])
const refuser = (m) => { console.log(`${NOM} : appel refusé — ${m}`); process.exit(2) }
if (o.inconnues.length) refuser(`option(s) inconnue(s) : ${o.inconnues.join(' ')}`)
const RACINE = o.valeurs.racine ? path.resolve(o.valeurs.racine) : R
if (!fs.existsSync(RACINE) || !fs.statSync(RACINE).isDirectory()) refuser(`--racine : ${RACINE} n'est pas un dossier`)
const REEL = o.drapeaux.has('reel'), TEMOIN = o.drapeaux.has('temoin'), PREUVE = o.drapeaux.has('preuve-echecs')
const T = path.join(TRAVAIL, NOM)
const SOUS_UD2 = ['UD-2a', 'UD-2b', 'UD-2c', 'UD-2d', 'UD-2e', 'UD-2f', 'UD-2g', 'UD-2h', 'UD-2i']
const SOUS_UD3 = ['UD-3a', 'UD-3b', 'UD-3c']
const ids = ['UD-1', 'UD-2', ...SOUS_UD2, 'UD-3', ...SOUS_UD3, ...(REEL ? ['UD-R'] : [])]
const DURCIR = path.join(RACINE, 'scripts', 'usine', 'durcir.sh')
const USINE_MJS = path.join(RACINE, 'scripts', 'usine.mjs')
const PATH_REEL = process.env.PATH ?? ''
const norm = (p) => path.normalize(String(p ?? ''))
/** Le code d'un script : sans les lignes de commentaire ni les commentaires de fin de ligne (hors guillemets). */
function sansCommentaires(t) {
  return lf(t).split('\n').map((l) => {
    if (/^\s*(#|\/\/)/.test(l)) return ''
    const m = /\s#/.exec(l)
    if (m && ((l.slice(0, m.index).match(/["']/g) ?? []).length % 2 === 0)) return l.slice(0, m.index)
    return l
  }).join('\n')
}

// ── UD-1 ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
function ud1(s) {
  const t = lireSi(DURCIR)
  if (t === null) { s.echoue('UD-1', 'scripts/usine/durcir.sh absent'); return false }
  const l = lf(t).split('\n')
  const e = []
  if (l[0] !== '#!/usr/bin/env bash') e.push(`première ligne « ${court(l[0], 40)} », « #!/usr/bin/env bash » attendu`)
  const suite = l.slice(1).find((x) => x.trim() && !x.trim().startsWith('#'))
  if (suite?.trim() !== 'set -euo pipefail') e.push(`première commande « ${court(suite ?? '(rien)', 40)} », « set -euo pipefail » attendu`)
  if (e.length) s.echoue('UD-1', e.join(' ; ')); else s.passe('UD-1', 'durcir.sh : #!/usr/bin/env bash puis set -euo pipefail')
  return t.length > 0
}

// ── Lecture de durcir.sh (UD-2f, UD-2i) ─────────────────────────────────────────────────────────────────────────────────────
function lectureDurcir(t) {
  const code = sansCommentaires(t), interdits = [], enDur = []
  if (/\bufw\b/.test(code)) interdits.push('ufw écrit dans le script')
  for (const l of code.split('\n')) {
    if (/\b(ip6?tables|nft)\b/.test(l) && (/\s-(A|I|D|F|X|P|R|Z|N|E)\b/.test(l) || /--(append|insert|delete|flush|policy|replace|new-chain|delete-chain)\b/.test(l))) interdits.push(`écriture pare-feu : « ${court(l, 60)} »`)
    if (/\b(iptables-restore|ip6tables-restore|netfilter-persistent)\b/.test(l)) interdits.push(`pare-feu : « ${court(l, 60)} »`)
    if (/\bapt(-get)?\s+(-\S+\s+)*(remove|purge|autoremove|autopurge)\b/.test(l) || /\bdpkg\s+(-r|-P|--remove|--purge)\b/.test(l)) interdits.push(`désinstallation : « ${court(l, 60)} »`)
    if (/\/(usr\/)?s?bin\/(visudo|useradd|gpasswd|systemctl|install|findmnt|id|getent|sudo|chown|ufw|iptables|ip6tables|nft|apt|apt-get)\b/.test(l)) enDur.push(`commande par chemin absolu : « ${court(l, 60)} »`)
    if (/\/(etc\/(sudoers|group|passwd|shadow|ssh)|home\/|root\/)/.test(l) && !l.includes('$')) enDur.push(`chemin système en dur, sans variable de racine : « ${court(l, 60)} »`)
  }
  return { interdits: [...new Set(interdits)], enDur: [...new Set(enDur)] }
}

// ── L'exécution dans le faux système ────────────────────────────────────────────────────────────────────────────────────────
function empreinteReelle() {
  const p = []
  for (const f of ['/etc/group', '/etc/passwd', '/etc/sudoers']) { try { p.push(`${f}:${sha(fs.readFileSync(f))}`) } catch { /* absent ou illisible : rien à surveiller */ } }
  try { for (const n of fs.readdirSync('/etc/sudoers.d').sort()) { try { p.push(`sudoers.d/${n}:${sha(fs.readFileSync(path.join('/etc/sudoers.d', n)))}`) } catch { p.push(`sudoers.d/${n}:illisible`) } } } catch { /* absent */ }
  return p.join('\n')
}
function jouerScenario(nom, { sys, cle, nfs = false, journal }) {
  const dossier = path.join(T, nom)
  fs.mkdirSync(path.join(dossier, 'tmp'), { recursive: true }); fs.mkdirSync(path.join(dossier, 'home'), { recursive: true })
  const fJournal = path.join(dossier, journal ?? 'journal.tsv')
  fs.rmSync(fJournal, { force: true })
  const env = { PATH: `${path.join(T, 'bin')}${path.delimiter}${PATH_REEL}`, HOME: path.join(dossier, 'home'), TMPDIR: path.join(dossier, 'tmp'), LANG: 'C', LC_ALL: 'C', ESSAI_RACINE: sys, ESSAI_JOURNAL: fJournal, ESSAI_NFS: nfs ? '1' : '0', ESSAI_PATH_REEL: PATH_REEL }
  const avant = instantane(sys)
  const r = lancer('bash', [DURCIR, `--racine-systeme=${sys}`, cle], { cwd: dossier, env, timeout: 60_000 })
  return { ...r, sys, avant, apres: instantane(sys), appels: lireJournal(fJournal), sortie: `${r.stdout}\n${r.stderr}` }
}
const dsud = (sys) => path.join(sys, 'etc', 'sudoers.d')

/** Un appel `install` décortiqué : { mode, srcs[], dest, appel }. */
function analyserInstall(appel) {
  const a = appel.args, pos = []
  let mode = null
  for (let i = 0; i < a.length; i++) {
    const x = a[i]
    if (x === '-m' || x === '--mode') { mode = a[++i]; continue }
    if (/^-m./.test(x)) { mode = x.slice(2); continue }
    if (/^--mode=/.test(x)) { mode = x.slice(7); continue }
    if (['-o', '-g', '-t', '-S', '--owner', '--group'].includes(x)) { i++; continue }
    if (x.startsWith('-')) continue
    pos.push(x)
  }
  return { mode: mode === null ? null : parseInt(mode, 8), srcs: pos.slice(0, -1), dest: pos.length ? norm(pos[pos.length - 1]) : null, appel }
}
const visudoValide = (appel) => appel.nom === 'visudo' && (appel.args.some((x) => /^-[a-z]*c[a-z]*f?$/.test(x) || x === '--check') || appel.args.includes('-c'))

/** Les fichiers sudoers posés : temporaire, visudo -cf puis install -m 440. → erreurs[] */
function erreursSudoers(sc, noms) {
  const e = [], installes = new Set()
  const calls = sc.appels
  for (const nom of noms) {
    const dest = norm(path.join(dsud(sc.sys), nom))
    const inst = calls.map((c, i) => ({ c, i })).filter(({ c }) => c.nom === 'install').map(({ c, i }) => ({ ...analyserInstall(c), i })).filter((x) => x.dest === dest)
    if (!inst.length) { e.push(`${nom} : aucun « install » vers ${nom}`); continue }
    installes.add(nom)
    const x = inst[inst.length - 1]
    if (x.mode !== 0o440) e.push(`${nom} : install -m ${x.mode === null ? '(absent)' : x.mode.toString(8)}, 440 attendu`)
    const src = x.srcs[0]
    if (!src) { e.push(`${nom} : install sans fichier source`); continue }
    if (norm(src) === dest) e.push(`${nom} : installé depuis lui-même`)
    const shaSrc = Object.entries(x.appel.sha).find(([k]) => norm(k) === norm(src))?.[1]
    const vis = calls.slice(0, x.i).filter((c) => visudoValide(c) && c.args.some((a) => norm(a) === norm(src)))
    if (!vis.length) e.push(`${nom} : pas de « visudo -cf » sur le fichier temporaire AVANT l'install`)
    else if (!vis.some((c) => Object.entries(c.sha).some(([k, v]) => norm(k) === norm(src) && v === shaSrc))) e.push(`${nom} : visudo a validé un autre contenu que celui installé`)
    const fin = path.join(dsud(sc.sys), nom)
    if (existe(fin) && shaSrc && sha(fs.readFileSync(fin)) !== shaSrc) e.push(`${nom} : le fichier final n'est pas celui que visudo a validé`)
    if (existe(fin) && (fs.statSync(fin).mode & 0o777) !== 0o440) e.push(`${nom} : mode final ${(fs.statSync(fin).mode & 0o777).toString(8)}, 440 attendu`)
  }
  const d = difference(sc.avant, sc.apres)
  for (const rel of [...d.modifies, ...d.ajoutes]) {
    const m = /^etc\/sudoers\.d\/(.+)$/.exec(rel)
    if (m && !installes.has(m[1])) e.push(`${rel} modifié ou laissé sans passer par install (édition sur place ou fichier oublié)`)
  }
  return e
}
const cleDuGardien = (sys) => path.join(sys, 'home', 'gardien', '.ssh', 'authorized_keys')
function erreursCle(sc, cle) {
  const f = cleDuGardien(sc.sys), e = []
  if (!existe(f)) return [`authorized_keys du gardien absent (${path.relative(sc.sys, f)})`]
  const l = lf(lire(f)).split('\n').filter((x) => x.trim())
  if (l.length !== 1 || l[0].trim() !== cle) e.push(`authorized_keys : ${l.length} clé(s) ${l.length === 1 ? 'dont ce n\'est pas celle passée en argument' : 'au lieu d\'une seule'}`)
  const m = fs.statSync(f).mode & 0o777
  if (m !== 0o600) e.push(`authorized_keys en ${m.toString(8)}, 600 attendu`)
  return e
}
const appelsDe = (sc, nom) => sc.appels.filter((c) => c.nom === nom)
const NFS_ARGS = (c) => c.args.includes('nfs,nfs4') || c.args.join(' ').includes('nfs,nfs4')
const touchePareFeu = (c) => ['ufw', 'iptables-restore', 'ip6tables-restore', 'netfilter-persistent'].includes(c.nom) || (['iptables', 'ip6tables', 'nft'].includes(c.nom) && c.args.some((x) => /^-(A|I|D|F|X|P|R|Z|N|E)$|^--(append|insert|delete|flush|policy|replace|new-chain|delete-chain)$|^(add|delete|flush|insert|replace|create)$/.test(x)))
const desinstalle = (c) => (['apt', 'apt-get'].includes(c.nom) && c.args.some((x) => ['remove', 'purge', 'autoremove', 'autopurge'].includes(x))) || (c.nom === 'dpkg' && c.args.some((x) => ['-r', '-P', '--remove', '--purge'].includes(x)))
const desactiveRpc = (c) => c.nom === 'systemctl' && c.args.some((x) => ['disable', 'stop', 'mask'].includes(x)) && c.args.some((x) => /^rpcbind(\.service|\.socket)?$/.test(x))

function jouerUd2(s, texteDurcir) {
  const sortir = (id, e, ok) => (e.length ? s.echoue(id, e.join(' ; ')) : s.passe(id, ok))
  const lu = lectureDurcir(texteDurcir)
  const e = Object.fromEntries(SOUS_UD2.map((id) => [id, []]))
  e['UD-2f'].push(...lu.interdits)
  e['UD-2i'].push(...lu.enDur)
  if (lu.enDur.length) { // sans risque pour le vrai système : on ne lance rien
    for (const id of SOUS_UD2) if (id !== 'UD-2f' && id !== 'UD-2i') e[id].push('non exécuté : chemin système en dur (voir UD-2i)')
    for (const id of SOUS_UD2) sortir(id, e[id], '')
    return
  }
  fs.rmSync(T, { recursive: true, force: true }); fs.mkdirSync(T, { recursive: true })
  ecrireDoublures(path.join(T, 'bin'))
  const cle = tirerClePublique('gardien-essai'), etrangere = tirerClePublique('intruse-essai')
  const reelAvant = empreinteReelle()
  const S1 = jouerScenario('1-frais', { sys: creerFauxSysteme(path.join(T, '1-frais', 'sys')), cle })
  const S2 = jouerScenario('2-second-passage', { sys: S1.sys, cle, journal: 'journal-2.tsv' })
  const S3 = jouerScenario('3-nfs-monte', { sys: creerFauxSysteme(path.join(T, '3-nfs-monte', 'sys')), cle, nfs: true })
  const S4 = jouerScenario('4-deja-durci', { sys: creerFauxSysteme(path.join(T, '4-deja-durci', 'sys'), { gardien: 'present', regleUsine: 'retiree', groupes: 'propres', rpcbind: 'coupe', cle, cleEtrangere: etrangere }), cle })
  if (empreinteReelle() !== reelAvant) e['UD-2i'].push('LE VRAI SYSTÈME A CHANGÉ (/etc/group, /etc/passwd, /etc/sudoers*) : durcir.sh ne respecte pas --racine-systeme')
  for (const [nom, sc] of [['frais', S1], ['second passage', S2], ['NFS monté', S3], ['déjà durci', S4]]) {
    if (sc.code !== 0) e['UD-2i'].push(`passage « ${nom} » : code ${sc.code ?? 'aucun'}${sc.expire ? ' (délai dépassé)' : ''} — ${court(sc.sortie.trim().split('\n').slice(-2).join(' / '), 120)}`)
  }
  const f90 = fixture('90-cloud-init-users'), fGroup = fixture('group')
  // — passages frais (sans et avec NFS) : tout le durcissement ——————————————————————————————
  for (const [nom, sc] of [['frais', S1], ['NFS monté', S3]]) {
    const p = `[${nom}] `
    e['UD-2a'].push(...erreursSudoers(sc, ['presti-gardien', '90-cloud-init-users']).map((x) => p + x))
    const f = path.join(dsud(sc.sys), '90-cloud-init-users')
    if (!existe(f)) e['UD-2b'].push(`${p}90-cloud-init-users a disparu`)
    else {
      const t = lf(lire(f)), att = attendu90(f90)
      if (t !== att) {
        const a = att.split('\n'), b = t.split('\n')
        const manque = a.filter((x) => !b.includes(x)), en_trop = b.filter((x) => !a.includes(x))
        e['UD-2b'].push(`${p}contenu différent de « fixture moins la ligne usine »${b.includes(LIGNE_USINE) ? ' : la ligne usine est toujours là' : ''}${manque.length ? ` ; ligne(s) perdue(s) : ${manque.map((x) => `« ${court(x, 30)} »`).slice(0, 3).join(' ')}` : ''}${en_trop.length ? ` ; ligne(s) en trop : ${en_trop.map((x) => `« ${court(x, 30)} »`).slice(0, 3).join(' ')}` : ''}${!manque.length && !en_trop.length ? ' ; mêmes lignes mais octets ou ordre différents' : ''}`)
      }
    }
    for (const n of FICHIERS_INTACTS) {
      const a = sc.avant.get(`etc/sudoers.d/${n}`), b = sc.apres.get(`etc/sudoers.d/${n}`)
      if (!b) e['UD-2c'].push(`${p}${n} a disparu`)
      else if (a.sha !== b.sha || a.mode !== b.mode || a.mtime !== b.mtime) e['UD-2c'].push(`${p}${n} touché (${a.sha !== b.sha ? 'contenu' : a.mode !== b.mode ? 'mode' : 'date : réécrit'})`)
    }
    if (sc.appels.some((c) => c.nom === 'install' && analyserInstall(c).dest && FICHIERS_INTACTS.some((n) => analyserInstall(c).dest.endsWith(n)))) e['UD-2c'].push(`${p}un install vise presti-agents ou presti-chef-modele*`)
    const g = existe(path.join(sc.sys, 'etc', 'group')) ? lf(lire(path.join(sc.sys, 'etc', 'group'))) : ''
    if (g !== attenduGroup(fGroup)) e['UD-2d'].push(`${p}/etc/group : usine doit sortir de sudo et de docker et de rien d'autre (reçu : ${court(g.split('\n').filter((l, i) => l !== fGroup.split('\n')[i]).join(' | '), 100)})`)
    for (const grp of ['sudo', 'docker']) if (!appelsDe(sc, 'gpasswd').some((c) => ['-d', '--delete'].includes(c.args[0]) && c.args[1] === 'usine' && c.args[2] === grp && c.args.length === 3)) e['UD-2d'].push(`${p}aucun « gpasswd -d usine ${grp} »`)
    const useradd = appelsDe(sc, 'useradd')
    if (useradd.length !== 1) e['UD-2e'].push(`${p}useradd appelé ${useradd.length} fois, une attendue (gardien manquait)`)
    else {
      const a = useradd[0].args
      if (a[a.length - 1] !== 'gardien' || !(a.includes('--create-home') || a.includes('-m')) || !(a.join(' ').includes('--shell /bin/bash') || a.join(' ').includes('-s /bin/bash'))) e['UD-2e'].push(`${p}useradd ${court(a.join(' '), 70)} : « --create-home --shell /bin/bash gardien » attendu`)
    }
    e['UD-2e'].push(...erreursCle(sc, cle).map((x) => p + x))
    const pg = path.join(dsud(sc.sys), 'presti-gardien')
    if (!existe(pg)) e['UD-2e'].push(`${p}/etc/sudoers.d/presti-gardien absent`)
    else if (lf(lire(pg)).trim() !== LIGNE_GARDIEN) e['UD-2e'].push(`${p}presti-gardien : « ${court(lire(pg), 50)} », « ${LIGNE_GARDIEN} » attendu`)
    for (const c of sc.appels) {
      if (touchePareFeu(c)) e['UD-2f'].push(`${p}appel ${c.nom} ${court(c.args.join(' '), 40)}`)
      if (desinstalle(c)) e['UD-2f'].push(`${p}appel ${c.nom} ${court(c.args.join(' '), 40)}`)
    }
    if (!appelsDe(sc, 'findmnt').some(NFS_ARGS)) e['UD-2g'].push(`${p}findmnt -t nfs,nfs4 jamais appelé`)
  }
  // — rpcbind : les deux cas ————————————————————————————————————————————————————————————————
  const coupes = S1.appels.filter(desactiveRpc)
  const unites = new Set(coupes.filter((c) => c.args.includes('disable')).flatMap((c) => c.args.filter((x) => /^rpcbind/.test(x)).map((x) => x.replace(/\.service$/, ''))))
  if (!coupes.some((c) => c.args.includes('disable') && c.args.includes('--now')) || !unites.has('rpcbind') || !unites.has('rpcbind.socket')) e['UD-2g'].push('[NFS absent] « systemctl disable --now rpcbind rpcbind.socket » attendu')
  if (!existe(path.join(S1.sys, 'var', 'etat-rpcbind'))) e['UD-2g'].push('[NFS absent] rpcbind n\'est pas désactivé à la fin')
  if (S3.appels.some(desactiveRpc) || existe(path.join(S3.sys, 'var', 'etat-rpcbind'))) e['UD-2g'].push('[NFS monté] rpcbind coupé alors qu\'un partage NFS est monté')
  // — second passage : idempotence ——————————————————————————————————————————————————————————
  {
    const d = difference(S1.apres, S2.apres)
    const mod = [...d.ajoutes, ...d.retires, ...d.modifies]
    if (mod.length) e['UD-2h'].push(`second passage : ${mod.length} fichier(s) changé(s) (${mod.slice(0, 3).join(', ')})`)
    if (appelsDe(S2, 'useradd').length) e['UD-2h'].push('second passage : useradd rappelé (gardien recréé)')
    if (!/(d[ée]j[àa]|rien [àa] changer|inchang|idempot|aucun changement|already|nothing (to|changed)|no change)/i.test(S2.sortie)) e['UD-2h'].push('second passage : ne dit pas qu\'il n\'a rien changé (« déjà », « rien à changer », « inchangé »…)')
    for (const c of S2.appels) { if (touchePareFeu(c) || desinstalle(c)) e['UD-2f'].push(`[second passage] appel ${c.nom} ${court(c.args.join(' '), 40)}`) }
  }
  // — état déjà durci : gardien existant (avec une clé étrangère), règle usine déjà retirée ——————
  {
    const p = '[déjà durci] '
    if (appelsDe(S4, 'useradd').length) e['UD-2e'].push(`${p}useradd appelé alors que gardien existe`)
    e['UD-2e'].push(...erreursCle(S4, cle).map((x) => p + x))
    if (!existe(path.join(dsud(S4.sys), 'presti-gardien')) || lf(lire(path.join(dsud(S4.sys), 'presti-gardien'))).trim() !== LIGNE_GARDIEN) e['UD-2e'].push(`${p}presti-gardien absent ou changé`)
    const d = difference(S4.avant, S4.apres)
    const autres = [...d.ajoutes, ...d.retires, ...d.modifies].filter((x) => !x.endsWith('.ssh/authorized_keys'))
    if (autres.length) e['UD-2h'].push(`${p}un état déjà durci a changé : ${autres.slice(0, 3).join(', ')}`)
    for (const n of FICHIERS_INTACTS) { const a = S4.avant.get(`etc/sudoers.d/${n}`), b = S4.apres.get(`etc/sudoers.d/${n}`); if (!b || a.sha !== b.sha || a.mtime !== b.mtime) e['UD-2c'].push(`${p}${n} touché`) }
    for (const c of S4.appels) { if (touchePareFeu(c) || desinstalle(c)) e['UD-2f'].push(`${p}appel ${c.nom} ${court(c.args.join(' '), 40)}`) }
    if (!appelsDe(S4, 'findmnt').some(NFS_ARGS)) e['UD-2g'].push(`${p}findmnt -t nfs,nfs4 jamais appelé`)
  }
  const dedoublonne = (l) => [...new Set(l)]
  sortir('UD-2a', dedoublonne(e['UD-2a']), 'sudoers posés par fichier temporaire, visudo -cf puis install -m 440, jamais en place (presti-gardien, 90-cloud-init-users)')
  sortir('UD-2b', dedoublonne(e['UD-2b']), '90-cloud-init-users : seule la ligne usine retirée, les autres lignes à l\'octet')
  sortir('UD-2c', dedoublonne(e['UD-2c']), 'presti-agents et presti-chef-modele-essai intacts (contenu, mode, date) aux trois passages')
  sortir('UD-2d', dedoublonne(e['UD-2d']), 'gpasswd -d usine sudo et gpasswd -d usine docker ; /etc/group : rien d\'autre changé')
  sortir('UD-2e', dedoublonne(e['UD-2e']), 'gardien créé une fois s\'il manque (jamais recréé), authorized_keys en 600 avec la seule clé passée en argument, presti-gardien posé')
  sortir('UD-2f', dedoublonne(e['UD-2f']), 'aucun ufw, aucune écriture iptables, aucun apt remove (lu dans le script et constaté sur les appels)')
  sortir('UD-2g', dedoublonne(e['UD-2g']), 'rpcbind désactivé sans NFS monté (rpcbind et rpcbind.socket, --now), laissé en place avec NFS monté')
  sortir('UD-2h', dedoublonne(e['UD-2h']), 'second passage identique à l\'octet et le dit ; gardien existant (clé étrangère remplacée) et règle déjà retirée acceptés')
  sortir('UD-2i', dedoublonne(e['UD-2i']), 'code 0 aux quatre passages, aucun chemin système en dur, vrai système intact')
}

// ── UD-3 : usine.mjs ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function scriptPreparer(t) {
  const i = t.indexOf('async function preparer()'), k = t.indexOf('// ── lancer', i)
  return i < 0 ? null : t.slice(i, k < 0 ? undefined : k)
}
function jouerUd3(s) {
  const t = lireSi(USINE_MJS)
  if (t === null) { for (const id of SOUS_UD3) s.echoue(id, 'scripts/usine.mjs absent'); return }
  const code = sansCommentaires(t)
  if (/sudo\s+-n\s+true/.test(code)) s.echoue('UD-3a', 'usine.mjs exige encore « sudo -n true » (le compte usine n\'a plus de sudo)')
  else s.passe('UD-3a', 'aucun « sudo -n true » dans le code de usine.mjs')
  const prep = scriptPreparer(t)
  if (prep === null) s.echoue('UD-3b', 'fonction preparer() introuvable dans usine.mjs')
  else {
    const c = sansCommentaires(prep), e = []
    if (/--with-deps/.test(c)) e.push('« playwright install --with-deps » lance sudo sous le compte usine : à passer par gardien ou à sauter quand les dépendances sont là')
    if (/\bsudo\s+(-\S+\s+)*(apt|apt-get|sh|bash|npx|playwright|dpkg)\b/.test(c)) e.push('un « sudo <commande> » est envoyé au compte usine')
    if (e.length) s.echoue('UD-3b', e.join(' ; ')); else s.passe('UD-3b', 'le script de préparation envoyé à usine n\'appelle ni --with-deps ni sudo <commande>')
  }
  // essayé : sur la doublure de ssh
  const d = path.join(T, 'ud3'); fs.rmSync(d, { recursive: true, force: true })
  const bin = path.join(d, 'bin')
  ecrireDoublesSsh({ bin, binUsine: path.join(d, 'bin-usine'), homeUsine: path.join(d, 'home-usine'), homePc: path.join(d, 'home-pc'), appels: path.join(d, 'appels') })
  const fJournal = path.join(d, 'journal.tsv')
  const env = { PATH: `${bin}${path.delimiter}${PATH_REEL}`, HOME: path.join(d, 'home-pc'), USERPROFILE: path.join(d, 'home-pc'), PRESTI_USINE: '[EMAIL_MASQUE]', LANG: 'C', ESSAI_JOURNAL: fJournal, ESSAI_APPELS: path.join(d, 'appels'), ESSAI_HOME_USINE: path.join(d, 'home-usine'), ESSAI_BIN_USINE: path.join(d, 'bin-usine'), ESSAI_PATH_REEL: PATH_REEL }
  const r = lancer(process.execPath, [USINE_MJS, 'preparer'], { cwd: d, env, timeout: 90_000 })
  const j = lireJournal(fJournal), sortie = `${r.stdout}\n${r.stderr}`
  const e = []
  const appels = j.filter((c) => c.nom === 'appel')
  const versUsine = appels.filter((c) => c.args[1].startsWith('usine@')), versGardien = appels.filter((c) => c.args[1].startsWith('gardien@'))
  if (!versUsine.length) e.push('aucun appel ssh vers usine@ : la préparation n\'a rien envoyé à l\'usine')
  if (r.code !== 0) e.push(`preparer rend le code ${r.code ?? 'aucun'}${r.expire ? ' (délai)' : ''} sur une usine SANS sudo : ${court(sortie.trim().split('\n').slice(-2).join(' / '), 150)}`)
  if (versUsine.some((c) => /presti-usine-gardien/.test(c.args[2]))) e.push('la clé du gardien sert à joindre usine@')
  if (versGardien.some((c) => !/presti-usine-gardien$/.test(c.args[2]))) e.push('un appel gardien@ n\'utilise pas ~/.ssh/presti-usine-gardien')
  if (j.some((c) => c.nom === 'npx' && c.args.includes('--with-deps'))) e.push('npx playwright install --with-deps exécuté sous usine (il appelle sudo)')
  if (e.length) s.echoue('UD-3c', e.join(' ; ')); else s.passe('UD-3c', `preparer sur doublure de ssh, usine sans sudo : code 0 (${versUsine.length} appel(s) usine@${versGardien.length ? `, ${versGardien.length} gardien@` : ''})`)
}

// ── UD-R (--reel), en lecture seule ─────────────────────────────────────────────────────────────────────────────────────────
/** Lit le « avant » de durcissement.md : unités presti-*, iptables -S INPUT, écoutes attendues. (fonctions pures, essayées à part) */
export function lireDurcissement(texte) {
  const l = lf(texte).split('\n'), idx = l.findIndex((x) => /^#{1,6}\s.*apr[eè]s/i.test(x))
  const avant = (idx < 0 ? l : l.slice(0, idx))
  const unites = new Map()
  for (const x of avant) { const m = /^\s*[●*]?\s*(presti-[\w@.:-]+\.(?:service|timer|socket|path))\s+(\S+)\s+(\S+)\s+(\S+)/.exec(x); if (m) unites.set(m[1], `${m[3]} ${m[4]}`) }
  const iptables = avant.filter((x) => /^\s*-[PA] INPUT\b/.test(x)).map((x) => x.trim())
  const ecoutes = []
  let dans = false
  for (const x of avant) {
    if (/^#{1,6}\s/.test(x)) dans = /[ée]coutes attendues/i.test(x)
    if (!dans) continue
    for (const m of x.matchAll(/(\[[0-9a-fA-F:]+\]|\d{1,3}(?:\.\d{1,3}){3}|\*):(\d{1,5})\b/g)) ecoutes.push({ adresse: m[1], port: Number(m[2]) })
    if (!/(\[[0-9a-fA-F:]+\]|\d{1,3}(?:\.\d{1,3}){3}|\*):\d/.test(x)) for (const m of x.matchAll(/\b(?:sur |port )?(\d{2,5})\b/g)) if (/(sshd|rpcbind|port|sur)/i.test(x)) ecoutes.push({ adresse: null, port: Number(m[1]) })
  }
  return { unites, iptables, ecoutes }
}
const boucleLocale = (a) => /^127\./.test(a) || a === '[::1]' || a === '::1'
/** Les écoutes de `ss -ltn` (colonne Local Address:Port) → [{ adresse, port }]. */
export function lireEcoutes(ss) {
  const out = []
  for (const x of lf(ss).split('\n')) {
    const m = /^LISTEN\s+\d+\s+\d+\s+(\S+):(\d+)\s/.exec(x) ?? /^LISTEN\s+\d+\s+\d+\s+(\S+):(\d+)$/.exec(x.trim())
    if (m) out.push({ adresse: m[1].replace(/%.*$/, ''), port: Number(m[2]) })
  }
  return out
}
/** Erreurs des écoutes : hors boucle locale seulement 22 (et 111 si rpcbind est dans la liste attendue) ; toute écoute dans la liste. */
export function erreursEcoutes(courantes, attendues) {
  const e = []
  const ports111 = attendues.some((a) => a.port === 111)
  for (const c of courantes) {
    const etiquette = `${c.adresse}:${c.port}`
    if (!boucleLocale(c.adresse) && c.port !== 22 && !(c.port === 111 && ports111)) { e.push(`écoute ${etiquette} hors de la boucle locale (seul le port 22 est admis)`); continue }
    if (c.port === 22) continue
    if (!attendues.some((a) => a.port === c.port && (a.adresse === null || a.adresse === '*' || a.adresse === c.adresse || (a.adresse === '0.0.0.0' && c.adresse === '0.0.0.0')))) e.push(`écoute ${etiquette} absente de la liste attendue de durcissement.md`)
  }
  return e
}
/** Les règles de `sudo -n -l` de usine : seules les étroites sont admises. */
export function erreursReglesSudo(sortie) {
  const e = []
  const debut = lf(sortie).split('\n').findIndex((x) => /may run the following commands|peut ex[ée]cuter les commandes suivantes/i.test(x))
  if (debut < 0) return e // « a password is required » : aucune règle sans mot de passe, c'est admis
  for (const x of lf(sortie).split('\n').slice(debut + 1).map((y) => y.trim()).filter(Boolean)) {
    const ok = /^\((agents)\)\s+NOPASSWD:.*presti-(coffre|journal)\b/.test(x) || /^\((chef-modele)\)\s+NOPASSWD:.*presti-chef-modele-essai\b/.test(x)
    if (!ok) e.push(`règle sudo non admise : « ${court(x, 80)} »`)
  }
  return e
}
async function udR(s) {
  const dir = path.join(os.homedir(), '.ssh')
  const cleU = path.join(dir, 'presti-usine'), cleG = path.join(dir, 'presti-usine-gardien')
  const hote = process.env.PRESTI_USINE ?? 'usine@88.96.53.3', h = hote.split('@').pop()
  for (const c of [cleU, cleG]) if (!existe(c)) refuser(`préalable : ${c.replace(os.homedir(), '~')} absent (UD-R se joue sur le poste, avec les deux clés)`)
  const ssh = (cle, cible, cmd, timeout = 40_000) => lancer('ssh', ['-i', cle, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10', cible, cmd], { timeout })
  const sonde = ssh(cleU, `usine@${h}`, 'true')
  if (sonde.code !== 0) refuser(`préalable : usine injoignable (${court(sonde.stderr || sonde.erreur, 100)})`)
  const U = (cmd) => ssh(cleU, `usine@${h}`, cmd), G = (cmd) => ssh(cleG, `gardien@${h}`, cmd)
  const e = [], vus = []
  const doc = lireDurcissement(lireSi(path.join(RACINE, '.orchestre/preuves/026-197/durcissement.md')) ?? '')
  const docPresent = existe(path.join(RACINE, '.orchestre/preuves/026-197/durcissement.md'))
  // sous usine
  const a = U('sudo -n true')
  if (a.code === 0) e.push('sous usine, « sudo -n true » réussit : le sudo sans mot de passe n\'est pas retiré'); else if (a.code === 255) e.push('sudo -n true : ssh en échec'); else vus.push('sudo -n true refusé')
  const b = U('sudo -n -l 2>&1')
  e.push(...erreursReglesSudo(`${b.stdout}${b.stderr}`))
  const c = U('id -nG')
  const groupes = c.stdout.trim().split(/\s+/)
  if (c.code !== 0) e.push('id -nG : échec'); else { for (const g of ['sudo', 'docker']) if (groupes.includes(g)) e.push(`id -nG de usine contient encore « ${g} »`); vus.push(`groupes : ${groupes.join(' ')}`) }
  const dk = U('docker ps 2>&1')
  if (dk.code === 0) e.push('sous usine, « docker ps » réussit'); else if (dk.code === 255) e.push('docker ps : ssh en échec')
  const fl = U("curl -s -o /dev/null -m 10 -w '%{http_code}' http://127.0.0.1:3001/health; echo; curl -s -o /dev/null -m 10 -w '%{http_code}' http://127.0.0.1:3001/v1/models")
  if (!fl.stdout.split('\n').some((x) => /^[1-5]\d\d$/.test(x.trim()))) e.push('freellmapi ne répond plus sur 127.0.0.1:3001 (route de santé à confirmer : /health et /v1/models essayées, tout code HTTP compte)'); else vus.push('freellmapi répond')
  // unités et pare-feu, comparés à l'avant
  if (!docPresent) e.push('.orchestre/preuves/026-197/durcissement.md absent : la liste « avant » (unités, iptables, écoutes) n\'existe pas')
  const un = G('systemctl list-units "presti-*" --all --no-legend 2>&1')
  const maintenant = new Map()
  for (const x of lf(un.stdout).split('\n')) { const m = /^\s*[●*]?\s*(presti-[\w@.:-]+\.(?:service|timer|socket|path))\s+(\S+)\s+(\S+)\s+(\S+)/.exec(x); if (m) maintenant.set(m[1], `${m[3]} ${m[4]}`) }
  if (docPresent && !doc.unites.size) e.push('durcissement.md : aucune unité presti-* dans la partie « avant »')
  for (const [u, etat] of doc.unites) if (maintenant.get(u) !== etat) e.push(`unité ${u} : « ${maintenant.get(u) ?? 'absente'} » au lieu de « ${etat} » (avant)`)
  const ipt = G('sudo -n iptables -S INPUT 2>&1')
  const iptMaintenant = lf(ipt.stdout).split('\n').map((x) => x.trim()).filter((x) => /^-[PA] INPUT\b/.test(x))
  if (docPresent && !doc.iptables.length) e.push('durcissement.md : « iptables -S INPUT » de la partie « avant » introuvable')
  else if (doc.iptables.join('\n') !== iptMaintenant.join('\n')) e.push(`iptables -S INPUT différent de l'avant (${doc.iptables.length} règles avant, ${iptMaintenant.length} maintenant)`)
  // sous gardien
  const g = G('sudo -n true')
  if (g.code !== 0) e.push('sous gardien, « sudo -n true » échoue'); else vus.push('gardien : sudo -n true réussit')
  const ss = G('ss -ltn')
  const ecoutes = lireEcoutes(ss.stdout)
  if (!ecoutes.length) e.push('ss -ltn : aucune écoute lue')
  const attendues = [...doc.ecoutes]
  const docOpenClaw = lireSi(path.join(RACINE, 'docs/agents/openclaw.md'))
  if (docOpenClaw) for (const m of docOpenClaw.matchAll(/(127(?:\.\d{1,3}){3}|\[::1\]):(\d{1,5})\b/g)) attendues.push({ adresse: m[1], port: Number(m[2]) })
  if (docPresent && !doc.ecoutes.length) e.push('durcissement.md : liste des écoutes attendues introuvable (titre « Écoutes attendues », une par ligne)')
  e.push(...erreursEcoutes(ecoutes, attendues))
  // les juges de l'usine, encore verts
  for (const [libelle, args] of [['usine.mjs etat', ['scripts/usine.mjs', 'etat']], ['usine-socle-qa --reel', ['scripts/usine-socle-qa.mjs', '--reel']], ['chef-qa --reel', ['scripts/chef-qa.mjs', '--reel']]]) {
    if (!existe(path.join(RACINE, args[0]))) { e.push(`${args[0]} absent`); continue }
    const r = lancer(process.execPath, args, { cwd: RACINE, timeout: 900_000 })
    if (r.code !== 0) e.push(`${libelle} : code ${r.code ?? 'aucun'}`); else vus.push(`${libelle} vert`)
  }
  if (e.length) s.echoue('UD-R', e.join(' ; ')); else s.passe('UD-R', vus.join(' ; '))
}

// ── Le jugement ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
async function juger() {
  const s = creerRapport(NOM, ids, { entete: `${NOM} (fiche 026-194) — racine ${RACINE}${TEMOIN ? ' — témoin' : ''}` })
  const fabrication = TEMOIN && !ficheLivree('026-197')
  if (fabrication) {
    for (const id of ids) if (id !== 'UD-R') s.saute(id, 'témoin : critère de fabrication, sauté tant que 026-197 n’est pas dans fait/ (sa propre PASS le prouvera)')
    const n = nonRegression({ racine: RACINE })
    s.note(n.ok ? 'non-régression : package.json et package-lock.json identiques à HEAD, npm run typecheck vert' : `non-régression en échec : ${n.echecs.join(' ; ')}`)
    if (!n.ok) s.echoue('UD-1', `non-régression : ${n.echecs.join(' ; ')}`)
    return s.fin()
  }
  if (process.platform === 'win32') refuser('préalable : bash et un système POSIX sont exigés (les doublures sont des scripts bash) : jouer ce juge sur l\'usine (usine.mjs executer) ou dans le cloud')
  if (lancer('bash', ['-c', 'exit 0']).code !== 0) refuser('préalable : bash introuvable')
  fs.rmSync(T, { recursive: true, force: true }); fs.mkdirSync(T, { recursive: true })
  const present = ud1(s)
  if (!present) for (const id of ['UD-2', ...SOUS_UD2]) s.echoue(id, 'non jugé : UD-1 en échec (durcir.sh absent)')
  else {
    jouerUd2(s, lire(DURCIR))
    const rouges = SOUS_UD2.filter((id) => s.enEchec(id))
    if (rouges.length) s.echoue('UD-2', `sous-critère(s) en échec : ${rouges.join(', ')}`); else s.passe('UD-2', 'durcir.sh lu et exécuté dans le faux système : quatre états, neuf sous-critères verts')
  }
  jouerUd3(s)
  const r3 = SOUS_UD3.filter((id) => s.enEchec(id))
  if (r3.length) s.echoue('UD-3', `sous-critère(s) en échec : ${r3.join(', ')}`); else s.passe('UD-3', 'usine.mjs : la préparation n\'exige plus sudo -n true (lu et essayé sur une doublure de ssh)')
  if (REEL) await udR(s)
  return s.fin()
}

// ── --preuve-echecs ─────────────────────────────────────────────────────────────────────────────────────────────────────────
function preuveEchecs() {
  const sortie = (a) => { const r = lancer(process.execPath, [CE, ...a], { timeout: 900_000 }); return { ...r, texte: `${r.stdout}${r.stderr}` } }
  const ref = sortie(['--racine=' + R])
  const premiere = ref.texte.split('\n').find((l) => /^(PASS|FAIL|SAUTE) UD-/.test(l)) ?? ''
  const e = []
  if (ref.code !== 1) e.push(`arbre courant : code ${ref.code}, 1 attendu`)
  if (!premiere.startsWith('FAIL UD-1 ')) e.push(`arbre courant : première ligne « ${court(premiere, 100)} », « FAIL UD-1 … » attendu`)
  const t = sortie(['--temoin'])
  if (t.code !== 0) e.push(`--temoin : code ${t.code} — ${court(t.texte.split('\n').filter((l) => /^FAIL|non-régression/.test(l)).join(' ; '), 200)}`)
  const lignes = ['## usine-durcie-qa', '', `Écrit par \`node scripts/usine-durcie-qa.mjs --preuve-echecs\` le ${new Date().toISOString().replace(/\.\d+Z$/, 'Z')}.`, '',
    '| Passage | Code | Extrait réel de la sortie |', '|---|---|---|',
    `| arbre courant (aucun durcir.sh) | ${ref.code} | ${premiere.replace(/\|/g, '\\|')} |`,
    `| \`--temoin\` (non-régression) | ${t.code} | ${(t.texte.split('\n').find((l) => /^usine-durcie-qa : /.test(l)) ?? '').replace(/\|/g, '\\|')} |`]
  const f = ecrireSectionEchecs('usine-durcie-qa', lignes)
  for (const l of [premiere, ...t.texte.split('\n').filter((x) => /^usine-durcie-qa : /.test(x))]) if (l && !lire(f).includes(l.replace(/\|/g, '\\|'))) e.push(`l’extrait « ${court(l, 60)} » n’a pas été retrouvé dans ${path.relative(R, f)}`)
  console.log(`${NOM} --preuve-echecs`)
  console.log(`${e.length ? 'FAIL' : 'PASS'} PE-1 — ${e.length ? e.join(' ; ') : `arbre courant : code ${ref.code}, « ${premiere} » ; --temoin : code ${t.code} ; section écrite dans ${path.relative(R, f)}`}`)
  console.log(`${NOM} --preuve-echecs : ${e.length ? 'FAIL — PE-1' : 'PASS'}`)
  return e.length ? 1 : 0
}
if (path.resolve(process.argv[1] ?? '') === CE) process.exitCode = PREUVE ? preuveEchecs() : await juger()
