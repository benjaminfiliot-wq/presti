#!/usr/bin/env node
// TÉMOIN du juge usine-socle-qa (026-048) : usine-agents minimal, écrit par Claude Code pour prouver que le juge sait passer
// au vert. Ce n'est PAS le livrable de 026-050.
//   socle [--a-sec] | maj [--forcer] | installer <groupe> | arreter <groupe> | etat
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ICI = path.dirname(fileURLToPath(import.meta.url))
const HOTE = process.env.PRESTI_USINE || 'usine@88.96.53.3'
const CLE = path.join(os.homedir(), '.ssh', 'presti-usine')
const PREAMBULE = '. "$HOME/.profile" >/dev/null 2>&1 || true\nset -euo pipefail\n'
const SYSTEMD = '/srv/presti-agents/scripts/usine/systemd'
const GROUPES = {
  surveillance: { motifs: ['presti-surveillance*'], service: 'presti-surveillance.service' },
  atelier: { motifs: ['presti-atelier*'] },
  livreur: { motifs: ['presti-livreur*'] },
  chef: { motifs: ['presti-chef*'] },
  porteur: { motifs: ['presti-porteur*', 'presti-export-nuit*'] },
  modeles: { motifs: ['presti-standard*', 'presti-facteur*'] },
}
const refuser = (m) => { process.stderr.write(`usine-agents : ${m}\n`); process.exit(2) }

function distant(script, { filtrer = false } = {}) {
  return new Promise((resoudre) => {
    const e = spawn(process.env.PRESTI_SSH_BIN || 'ssh', ['-i', CLE, '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=20', '-o', 'ServerAliveInterval=30', HOTE, 'bash -s'], { stdio: ['pipe', filtrer ? 'pipe' : 'inherit', 'inherit'], windowsHide: true })
    const m = []
    if (filtrer) e.stdout.on('data', (d) => m.push(d))
    e.on('error', () => resoudre(255))
    e.on('exit', (code) => {
      // Jamais une valeur : une ligne NOM=valeur renvoyée par l'usine est masquée.
      if (filtrer) process.stdout.write(Buffer.concat(m).toString('utf8').replace(/^([A-Z][A-Z0-9_]*)=.*$/gm, '$1=(valeur masquée)'))
      resoudre(code ?? 1)
    })
    e.stdin.on('error', () => {})
    e.stdin.end(`${PREAMBULE}${script}\n`)
  })
}
const finir = (code) => {
  if (code === 255) { process.stderr.write(`usine-agents : usine injoignable (${HOTE})\n`); process.exit(5) }
  process.exit(code)
}

const [cmd, ...reste] = process.argv.slice(2)
if (cmd === 'socle') {
  if (reste.length > 1 || (reste.length && reste[0] !== '--a-sec')) refuser('socle [--a-sec]')
  const script = fs.readFileSync(path.join(ICI, 'usine', 'socle.sh'), 'utf8').replace(/\r\n/g, '\n')
  if (reste[0] === '--a-sec') { process.stdout.write(`${PREAMBULE}${script}`); process.exit(0) }
  finir(await distant(script))
} else if (cmd === 'maj') {
  if (reste.length > 1 || (reste.length && reste[0] !== '--forcer')) refuser('maj [--forcer]')
  const forcer = reste[0] === '--forcer' ? 1 : 0
  finir(await distant([
    `FORCER=${forcer}`,
    'if [ "$FORCER" != 1 ] && systemctl list-units --state=active --no-legend --plain \'presti-*\' | grep -q .; then',
    '  echo "un service presti-* est actif : maj refusée (--forcer pour passer outre)" >&2',
    '  exit 1',
    'fi',
    'git -C "$HOME/presti" fetch -q origin',
    'AVANT=$(git -C /srv/presti-agents rev-parse HEAD)',
    'git -C /srv/presti-agents checkout -q --detach origin/main',
    'cd /srv/presti-agents',
    'if ! git -C /srv/presti-agents diff --quiet "$AVANT" HEAD -- package-lock.json; then',
    '  HUSKY=0 npm ci --ignore-scripts',
    'fi',
    'sudo -n install -d -o usine -g agents -m 750 /srv/playwright',
    'PLAYWRIGHT_BROWSERS_PATH=/srv/playwright npx playwright install chromium',
    'chmod -R g+rX,o-rwx /srv/playwright',
    'sudo -n chown -R usine:agents /srv/presti-agents',
    'chmod -R u=rwX,g=rX,o= /srv/presti-agents',
    'for n in coffre journal; do',
    '  if ! cmp -s "/srv/presti-agents/scripts/usine/presti-$n.sh" "/usr/local/bin/presti-$n"; then sudo -n install -o root -g root -m 755 "/srv/presti-agents/scripts/usine/presti-$n.sh" "/usr/local/bin/presti-$n"; fi',
    'done',
    'echo "déployé : $(git -C /srv/presti-agents rev-parse HEAD)"',
  ].join('\n')))
} else if (cmd === 'installer' || cmd === 'arreter') {
  if (reste.length !== 1 || !Object.hasOwn(GROUPES, reste[0])) refuser(`${cmd} <${Object.keys(GROUPES).join('|')}>`)
  const g = GROUPES[reste[0]]
  const sources = g.motifs.map((m) => `${SYSTEMD}/${m}`).join(' ')
  const minuteurs = g.motifs.map((m) => `/etc/systemd/system/${m}.timer`).join(' ')
  const L = []
  if (cmd === 'installer') {
    L.push(
      `for f in ${sources}; do`, '  [ -e "$f" ] || continue', '  sudo -n install -m 644 -o root -g root "$f" /etc/systemd/system/', 'done',
      `for f in ${sources}; do [ -e "$f" ] && sudo -n systemd-analyze verify "/etc/systemd/system/$(basename "$f")"; done`,
      'sudo -n systemctl daemon-reload',
      `for t in ${minuteurs}; do [ -e "$t" ] && sudo -n systemctl enable --now "$(basename "$t")"; done`,
    )
    if (g.service) L.push(`sudo -n systemctl enable --now ${g.service}`)
  } else {
    L.push(`for t in ${minuteurs}; do [ -e "$t" ] && sudo -n systemctl disable --now "$(basename "$t")"; done`)
    if (g.service) L.push(`sudo -n systemctl disable --now ${g.service}`)
  }
  L.push('true')
  finir(await distant(L.join('\n')))
} else if (cmd === 'etat') {
  if (reste.length) refuser('etat ne prend aucun argument')
  finir(await distant([
    'if id agents >/dev/null 2>&1; then echo "agents : présent"; else echo "agents : absent"; fi',
    "systemctl list-timers --all --no-pager 'presti-*' || true",
    "for u in $(systemctl list-units --all --no-legend --plain 'presti-*' | awk '{print $1}'); do echo \"$u $(systemctl show -p Result --value \"$u\")\"; done",
    'echo "coffre (noms) :"',
    'sudo -n -u agents /usr/local/bin/presti-coffre noms || true',
    'echo "déployé $(git -C /srv/presti-agents rev-parse HEAD) origin/main $(git -C "$HOME/presti" rev-parse origin/main)"',
    'free -m',
    'df -h /',
  ].join('\n'), { filtrer: true }))
} else refuser('socle [--a-sec] | maj [--forcer] | installer <groupe> | arreter <groupe> | etat')
