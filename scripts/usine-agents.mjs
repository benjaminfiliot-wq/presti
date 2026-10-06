#!/usr/bin/env node
// scripts/usine-agents.mjs — le socle des agents sur l'usine Oracle, manié depuis le poste (fiche 026-050).
//
// Usage :
//   node scripts/usine-agents.mjs socle [--a-sec]         → compte agents, /srv/presti-agents, assistants, sudoers (scripts/usine/socle.sh)
//                                                           --a-sec : imprime le script distant, n'appelle pas ssh
//   node scripts/usine-agents.mjs maj [--forcer]          → /srv/presti-agents sur origin/main, npm ci si package-lock.json a changé,
//                                                           Chromium de Playwright dans /srv/playwright, droits, assistants
//   node scripts/usine-agents.mjs installer <groupe>      → copie les unités presti-<groupe>* de l'arbre déployé et active les minuteurs
//   node scripts/usine-agents.mjs arreter <groupe>        → désactive (et arrête) les minuteurs du groupe
//   node scripts/usine-agents.mjs etat                    → compte agents, minuteurs, NOMS du coffre, commit déployé, mémoire, disque
// Groupes : surveillance, atelier, livreur, chef, porteur (presti-porteur* et presti-export-nuit*), sav, qualite, vigile (026-251), preneur, videos (l'analyste de vidéos, presti-videos*), modeles
// (presti-standard*, presti-facteur*, presti-facteur-soir*). Liste fermée : tout autre nom → code 2, rien n'est envoyé.
// Codes : 0 fait ; 1 refus de l'usine (maj : un service presti-* tourne) ou étape en échec ; 2 usage ; 3 sudo refusé ou
//   socle absent ; 5 usine injoignable ; sinon le code du script distant.
//
// Comme la fonction distant() de scripts/usine.mjs : le script distant part sur l'entrée standard de `ssh … bash -s`, après
// `. "$HOME/.profile"` (jamais `bash -l` : clear_console de ~/.bash_logout change le code de sortie), fins de ligne LF.
// Rien ne vient du poste hors ce texte : ni scp, ni fichier copié ; les assistants et les unités s'installent depuis
// /srv/presti-agents, qui ne porte que le code poussé sur main. Ce fichier ne touche pas à scripts/usine.mjs, qui reste le
// pont des fiches de l'orchestre sous le compte usine.
// Les gestes root (socle, maj, installer, arreter) demandent un compte qui a sudo sans mot de passe : depuis le 25/09,
// c'est ubuntu, même clé (presti-ops/usine/LISEZMOI.md, « Sudo restreint ») : PRESTI_USINE=ubuntu@<ip>. Les gestes du dépôt
// (git, npm) tournent toujours sous usine (sudo -u usine si le compte connecté est un autre). etat marche sous usine.
// Aucune valeur du coffre ne sort : l'usine n'imprime que des noms, et toute ligne « NOM=valeur » qui reviendrait quand même
// est masquée avant l'affichage.
// ssh : PRESTI_SSH_BIN pour les essais, sinon ssh ; hôte PRESTI_USINE, sinon usine@88.96.53.3 ; clé ~/.ssh/presti-usine ;
// spawn sans shell (mémoire spawn-windows-shell-ffmpeg).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SOCLE = path.join(RACINE, 'scripts', 'usine', 'socle.sh')
// L'IP de l'usine est éphémère (elle change si l'instance est recréée) : PRESTI_USINE=<compte>@<ip> la remplace.
const HOTE = process.env.PRESTI_USINE || 'usine@88.96.53.3'
const CLE = path.join(os.homedir(), '.ssh', 'presti-usine')
const SSH_BIN = process.env.PRESTI_SSH_BIN || 'ssh'
const SSH = ['-i', CLE, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', '-o', 'ServerAliveInterval=30']
const PREAMBULE = '. "$HOME/.profile" >/dev/null 2>&1 || true\nset -euo pipefail\n'
const USAGE = 'usage : node scripts/usine-agents.mjs socle [--a-sec] | maj [--forcer] | installer <groupe> | arreter <groupe> | etat'

// Les groupes d'unités : les fichiers copiés (motifs sous scripts/usine/systemd/) et les unités activées (dans
// /etc/systemd/system/) : les minuteurs, le chemin surveillé du chef (026-148), et presti-surveillance.service, qui n'a
// pas de minuteur. presti-telegram.service (026-195) n'est dans aucun groupe : sa mise en service est la sienne.
const GROUPES = Object.freeze({
  surveillance: { copier: ['presti-surveillance*'], activer: ['presti-surveillance.service'] },
  atelier: { copier: ['presti-atelier*'], activer: ['presti-atelier*.timer'] },
  livreur: { copier: ['presti-livreur*'], activer: ['presti-livreur*.timer'] },
  chef: { copier: ['presti-chef*'], activer: ['presti-chef*.timer', 'presti-chef*.path'] },
  porteur: { copier: ['presti-porteur*', 'presti-export-nuit*'], activer: ['presti-porteur*.timer', 'presti-export-nuit*.timer'] },
  modeles: { copier: ['presti-standard*', 'presti-facteur*'], activer: ['presti-standard*.timer', 'presti-facteur*.timer'] },
  sav: { copier: ['presti-sav*'], activer: ['presti-sav*.timer'] },
  qualite: { copier: ['presti-qualite*'], activer: ['presti-qualite*.timer'] },
  vigile: { copier: ['presti-vigile*'], activer: ['presti-vigile*.timer'] },
  preneur: { copier: ['presti-preneur*'], activer: ['presti-preneur*.timer'] },
  videos: { copier: ['presti-videos*'], activer: ['presti-videos*.timer'] },
})

class Arret extends Error {
  constructor(code, message) { super(message); this.code = code }
}
const usage = (pourquoi) => new Arret(2, `${pourquoi}\n  ${USAGE}`)
const lf = (s) => String(s).replace(/\r\n?/g, '\n')

// ── les gardes communes des scripts distants ────────────────────────────────────────────────────────────────────────
const exigerSudo = (quoi) => [
  'if ! sudo -n true 2>/dev/null; then',
  `  echo "✗ ${quoi} : sudo sans mot de passe refusé au compte $(id -un). Depuis le 25/09, les gestes root passent par ubuntu : PRESTI_USINE=ubuntu@<ip> node scripts/usine-agents.mjs ${quoi}" >&2`,
  '  exit 3',
  'fi',
]
// Les gestes du dépôt tournent sous usine, propriétaire de ~/presti et de l'arbre (git refuse un dépôt d'un autre compte).
const SOUS_USINE = 'if [ "$(id -un)" = usine ]; then sous_usine=""; else sous_usine="sudo -n -u usine -H"; fi'

// ── maj ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
function scriptMaj(forcer) {
  const garde = forcer
    ? ['echo "── --forcer : maj sans regarder les services presti-* en marche"']
    : [
        '# Un service en marche lit le code : on ne le change pas sous lui (la surveillance comprise).',
        'actifs=$(systemctl list-units --type=service --state=active,activating,deactivating,reloading --plain --no-legend \'presti-*\' 2>/dev/null | cut -d\' \' -f1 | tr \'\\n\' \' \' || true)',
        'if [ -n "${actifs// /}" ]; then',
        '  echo "✗ maj : service(s) presti-* en marche : ${actifs}— arreter <groupe> d\'abord, ou maj --forcer" >&2',
        '  exit 1',
        'fi',
      ]
  return [
    'umask 027',
    'cd /',
    ...exigerSudo('maj'),
    SOUS_USINE,
    'if ! sudo -n test -e /srv/presti-agents/.git || ! test -d /srv/playwright; then',
    '  echo "✗ maj : /srv/presti-agents ou /srv/playwright absent : node scripts/usine-agents.mjs socle d\'abord" >&2',
    '  exit 3',
    'fi',
    ...garde,
    '',
    '# L\'arbre sur origin/main (git fetch dans ~usine/presti : l\'arbre en partage les références).',
    'avant=$($sous_usine git -C /srv/presti-agents rev-parse HEAD)',
    '$sous_usine git -C /home/usine/presti fetch --quiet origin',
    '# --force : un fichier suivi modifié sur place revient à origin/main (seul le code poussé sur main tourne ici).',
    '$sous_usine git -C /srv/presti-agents checkout --quiet --force --detach origin/main',
    'echo "── arbre : ${avant:0:12} → $($sous_usine git -C /srv/presti-agents rev-parse --short=12 HEAD)"',
    '',
    '# Les dépendances, seulement si package-lock.json a changé depuis la dernière installation réussie (empreinte gardée',
    '# dans node_modules) ; jamais un script d\'installation de paquet, jamais sous agents.',
    'if [ "$($sous_usine sha256sum /srv/presti-agents/package-lock.json)" != "$($sous_usine cat /srv/presti-agents/node_modules/.presti-package-lock.sha256 2>/dev/null || true)" ]; then',
    '  echo "── dépendances : package-lock.json a changé (ou rien n\'est encore installé)"',
    '  $sous_usine env -C /srv/presti-agents HUSKY=0 npm ci --ignore-scripts',
    '  $sous_usine sha256sum /srv/presti-agents/package-lock.json | $sous_usine tee /srv/presti-agents/node_modules/.presti-package-lock.sha256 >/dev/null',
    'else',
    '  echo "── dépendances : package-lock.json inchangé"',
    'fi',
    '',
    '# Chromium de la version du dépôt, dans /srv/playwright (sinon Playwright le chercherait dans le ~/.cache du compte',
    '# qui tourne, et agents n\'en a pas) ; rien n\'est téléchargé s\'il y est déjà.',
    'echo "── navigateurs : chromium dans /srv/playwright"',
    '$sous_usine env -C /srv/presti-agents PLAYWRIGHT_BROWSERS_PATH=/srv/playwright npx --no playwright install chromium',
    '',
    '# Les droits : usine:agents, rien d\'inscriptible par le groupe ni par les autres.',
    'sudo -n chown -R usine:agents /srv/presti-agents /srv/playwright',
    'sudo -n find /srv/presti-agents -type d -exec chmod 2750 {} +',
    'sudo -n find /srv/presti-agents -type f -perm /u+x -exec chmod 750 {} +',
    'sudo -n find /srv/presti-agents -type f ! -perm /u+x -exec chmod 640 {} +',
    'sudo -n chmod -R u=rwX,g=rX,o= /srv/playwright',
    '',
    '# Les assistants, réinstallés s\'ils ont changé.',
    'for a in coffre journal; do',
    '  if ! sudo -n cmp -s /srv/presti-agents/scripts/usine/presti-$a.sh /usr/local/bin/presti-$a; then',
    '    sudo -n install -o root -g root -m 755 /srv/presti-agents/scripts/usine/presti-$a.sh /usr/local/bin/presti-$a',
    '    echo "── assistant presti-$a réinstallé"',
    '  fi',
    'done',
    '',
    '$sous_usine git -C /srv/presti-agents log -1 --date=iso --format=\'déployé : %H (%cd) %s\'',
    'echo "origin/main : $($sous_usine git -C /home/usine/presti rev-parse origin/main)"',
  ].join('\n')
}

// ── installer / arreter ─────────────────────────────────────────────────────────────────────────────────────────────
const SYSTEMD = '/srv/presti-agents/scripts/usine/systemd/'
const activables = (g) => GROUPES[g].activer.map((m) => `/etc/systemd/system/${m}`).join(' ')

function scriptInstaller(g) {
  const noms = GROUPES[g].copier.map((m) => `-name '${m}'`).join(' -o ')
  return [
    'cd /',
    ...exigerSudo(`installer ${g}`),
    '# Les unités du groupe, depuis l\'arbre déployé (maj d\'abord si elles viennent d\'être poussées).',
    `sources=$(sudo -n find ${SYSTEMD} -maxdepth 1 -type f \\( ${noms} \\) | sort)`,
    'if [ -z "$sources" ]; then',
    `  echo "✗ installer ${g} : aucune unité ${GROUPES[g].copier.join(', ')} dans ${SYSTEMD} (poussée sur main, puis maj ?)" >&2`,
    '  exit 1',
    'fi',
    'installees=""',
    'for f in $sources; do',
    '  sudo -n install -m 644 -o root -g root "$f" /etc/systemd/system/',
    '  installees="$installees /etc/systemd/system/${f##*/}"',
    '  echo "   copiée : ${f##*/}"',
    'done',
    '# Une unité fausse arrête tout ici, avant le rechargement : elle se corrige dans le dépôt, puis maj et installer.',
    'sudo -n systemd-analyze verify $installees',
    'sudo -n systemctl daemon-reload',
    `for u in ${activables(g)}; do`,
    '  [ -e "$u" ] || continue',
    '  sudo -n systemctl enable --now "${u##*/}"',
    '  echo "   activée : ${u##*/}"',
    'done',
    `systemctl list-timers --all --no-pager ${GROUPES[g].copier.map((m) => `'${m}'`).join(' ')} || true`,
  ].join('\n')
}

function scriptArreter(g) {
  return [
    'cd /',
    ...exigerSudo(`arreter ${g}`),
    `for u in ${activables(g)}; do`,
    '  [ -e "$u" ] || continue',
    '  sudo -n systemctl disable --now "${u##*/}"',
    '  echo "   désactivée : ${u##*/}"',
    'done',
  ].join('\n')
}

// ── etat ────────────────────────────────────────────────────────────────────────────────────────────────────────────
function scriptEtat() {
  return [
    'cd /',
    SOUS_USINE,
    'echo "── compte agents"',
    'if id agents >/dev/null 2>&1; then echo "présent : $(id agents)"; else echo "absent (socle pas encore posé)"; fi',
    'echo "── minuteurs presti-*"',
    'systemctl list-timers --all --no-pager \'presti-*\' || true',
    'echo "── services presti-* : état, dernier résultat, code"',
    'for u in $(systemctl list-units --all --type=service --plain --no-legend \'presti-*\' 2>/dev/null | cut -d\' \' -f1 || true); do',
    '  echo "$u : $(systemctl show -p ActiveState -p Result -p ExecMainStatus --value "$u" 2>/dev/null | tr \'\\n\' \' \')"',
    'done',
    'echo "── coffre : les noms, jamais une valeur"',
    'sudo -n -u agents /usr/local/bin/presti-coffre noms || echo "(illisible : socle pas encore posé ?)"',
    'sudo -n -u agents /usr/local/bin/presti-coffre etat || true',
    'echo "── code déployé"',
    'deploye=$($sous_usine git -C /srv/presti-agents rev-parse HEAD 2>/dev/null || echo absent)',
    'origine=$($sous_usine git -C /home/usine/presti rev-parse origin/main 2>/dev/null || echo inconnu)',
    'if [ "$deploye" = "$origine" ]; then echo "à jour : $deploye (origin/main)"; else echo "déployé $deploye, origin/main $origine : maj ?"; fi',
    '# Un fichier suivi modifié sur place ne vient pas de main : maj le remet (checkout --force).',
    'if modifies=$($sous_usine git -C /srv/presti-agents status --porcelain --untracked-files=no 2>/dev/null); then',
    '  echo "fichiers suivis modifiés sur place : $(printf \'%s\' "$modifies" | grep -c . || true) (0 attendu)"',
    'else',
    '  echo "fichiers suivis modifiés sur place : illisible"',
    'fi',
    'echo "── mémoire et disque"',
    'free -m',
    'df -h / /srv /home 2>/dev/null || df -h /',
  ].join('\n')
}

// ── ssh ─────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Deuxième barrière : une ligne « NOM=valeur » (nom en capitales, hors des quelques noms qui ne sont jamais des secrets)
// ou une forme de clé connue qui reviendrait de l'usine est masquée. L'usine n'imprime que des noms ; ceci ne sert que si
// quelque chose y a mal tourné.
const NON_SECRETS = new Set(['PRESTI_USINE', 'PRESTI_URL', 'PRESTI_HOTE', 'PLAYWRIGHT_BROWSERS_PATH', 'HUSKY', 'NODE_ENV', 'PATH', 'HOME', 'USER', 'LANG', 'TZ'])
const masquer = (ligne) => ligne
  .replace(/\b([A-Z][A-Z0-9_]{2,})=\S+/g, (m, nom) => (NON_SECRETS.has(nom) ? m : `${nom}=<masqué>`))
  .replace(/\b(?:eyJ|sb_secret_|sk_|sk-|rk_|whsec_)[A-Za-z0-9._~+/=-]{8,}/g, '<masqué>')
function relais(flux, sortie) {
  let reste = ''
  flux.setEncoding('utf8')
  flux.on('data', (morceau) => {
    const lignes = (reste + morceau).split('\n')
    reste = lignes.pop()
    for (const l of lignes) sortie.write(`${masquer(l)}\n`)
  })
  return () => { if (reste) sortie.write(masquer(reste)); reste = '' }
}

/** Le script sur l'entrée standard de `ssh … bash -s`, sorties relayées (masquées) au fil de l'eau ; rend le code. */
function distant(script) {
  if (!process.env.PRESTI_SSH_BIN && !fs.existsSync(CLE)) throw new Arret(5, `usine injoignable : clé ${CLE} absente`)
  return new Promise((resoudre) => {
    const enfant = spawn(SSH_BIN, [...SSH, HOTE, 'bash -s'], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })
    const finSortie = relais(enfant.stdout, process.stdout)
    const finErreur = relais(enfant.stderr, process.stderr)
    enfant.on('error', () => resoudre(255))
    enfant.on('close', (code) => { finSortie(); finErreur(); resoudre(code ?? 255) })
    enfant.stdin.on('error', () => { /* ssh sorti avant d'avoir tout lu : son code le dira */ })
    enfant.stdin.end(`${PREAMBULE}${lf(script)}\n`)
  })
}
async function lancer(script) {
  const code = await distant(script)
  if (code === 255) throw new Arret(5, `usine injoignable (${HOTE}) : l'IP est éphémère, PRESTI_USINE=<compte>@<ip> si l'instance a été recréée`)
  if (code !== 0) throw new Arret(code, `le script distant a rendu ${code} (voir ci-dessus)`)
}

// ── la grammaire : tout ce qui n'y est pas est un refus, avant tout ssh ─────────────────────────────────────────────
function groupe(commande, args) {
  if (args.length !== 1) throw usage(`${commande} : un groupe, rien d'autre (${Object.keys(GROUPES).join(', ')})`)
  if (!Object.hasOwn(GROUPES, args[0])) throw usage(`${commande} : groupe inconnu (${Object.keys(GROUPES).join(', ')})`)
  return args[0]
}

async function principal() {
  const [commande, ...args] = process.argv.slice(2)
  switch (commande) {
    case 'socle': {
      if (args.length > 1 || (args.length === 1 && args[0] !== '--a-sec')) throw usage('socle : seule option --a-sec')
      const script = lf(fs.readFileSync(SOCLE, 'utf8')).trim()
      if (args[0] === '--a-sec') { process.stdout.write(`${PREAMBULE}${script}\n`); return }
      return lancer(script)
    }
    case 'maj': {
      if (args.length > 1 || (args.length === 1 && args[0] !== '--forcer')) throw usage('maj : seule option --forcer')
      return lancer(scriptMaj(args[0] === '--forcer'))
    }
    case 'installer': return lancer(scriptInstaller(groupe('installer', args)))
    case 'arreter': return lancer(scriptArreter(groupe('arreter', args)))
    case 'etat': {
      if (args.length) throw usage('etat : aucun argument')
      return lancer(scriptEtat())
    }
    default:
      throw usage(commande === undefined ? 'sous-commande manquante' : 'sous-commande inconnue')
  }
}

// Pas de process.exit : les sorties relayées (un tube, asynchrone sous POSIX) se vident avant la fin du processus.
principal().then(() => { process.exitCode = 0 }, (e) => {
  if (e instanceof Arret) {
    console.error(`✗ usine-agents : ${e.message}`)
    process.exitCode = e.code
    return
  }
  console.error(`✗ usine-agents : erreur inattendue (${e && e.message ? e.message : e})`)
  process.exitCode = 1
})
