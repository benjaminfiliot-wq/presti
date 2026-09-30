// scripts/fixtures/026-transverse/usine-commun.mjs — aides de usine-durcie-qa (fiche 026-194, Claude Code).
// Le faux système de fichiers, les doublures de commandes (écrites à l'exécution, jamais gardées dans le dépôt), l'instantané d'un
// arbre et le journal des appels. N'écrit que dans le dossier de travail qu'on lui donne (.orchestre/travail/usine-durcie-qa/) ;
// aucun réseau, aucun secret : les clés publiques sont tirées au hasard à chaque passage (ce ne sont pas de vraies clés ssh).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { FIXTURES, lire, lf } from './commun.mjs'

export const DOSSIER_ESSAI = path.join(FIXTURES, 'usine-durcie')
export const LIGNE_USINE = 'usine ALL=(ALL) NOPASSWD:ALL'
export const LIGNE_GARDIEN = 'gardien ALL=(ALL) NOPASSWD:ALL'
export const FICHIERS_INTACTS = ['presti-agents', 'presti-chef-modele-essai']
const ANCIEN = new Date('2020-01-01T00:00:00Z')

export const sha = (b) => crypto.createHash('sha256').update(b).digest('hex')
export const fixture = (nom) => lire(path.join(DOSSIER_ESSAI, nom))

/** Une clé publique d'essai tirée au hasard (forme ssh-ed25519, mais rien qu'un motif : elle n'ouvre aucune porte). */
export const tirerClePublique = (commentaire) => `ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI${crypto.randomBytes(32).toString('base64').replace(/[+/=]/g, 'A')} ${commentaire}`

// ── Ce que le durcissement doit produire à partir des fichiers d'essai ─────────────────────────────────────────────────────
/** 90-cloud-init-users attendu : la fixture privée de ses lignes exactement égales à la règle usine, le reste à l'octet. */
export const attendu90 = (texte) => lf(texte).split('\n').filter((l) => l !== LIGNE_USINE).join('\n')
/** /etc/group attendu : `usine` retiré des groupes sudo et docker seulement (les autres lignes, les autres membres : à l'octet). */
export function attenduGroup(texte, groupes = ['sudo', 'docker']) {
  return lf(texte).split('\n').map((l) => {
    const p = l.split(':')
    if (p.length < 4 || !groupes.includes(p[0])) return l
    p[3] = p[3].split(',').filter((m) => m && m !== 'usine').join(',')
    return p.join(':')
  }).join('\n')
}

// ── Le faux système de fichiers ────────────────────────────────────────────────────────────────────────────────────────────
/**
 * Construit <dossier>/etc/{sudoers.d,group,passwd} et, si `gardien: 'present'`, <dossier>/home/gardien/.ssh/authorized_keys.
 * `regleUsine: 'retiree'`, `groupes: 'propres'` et `rpcbind: 'coupe'` posent l'état DÉJÀ durci ; `cleEtrangere` ajoute une clé inconnue au gardien existant.
 */
export function creerFauxSysteme(dossier, { gardien = 'absent', regleUsine = 'presente', groupes = 'usine', cle = null, cleEtrangere = null, rpcbind = 'actif' } = {}) {
  fs.rmSync(dossier, { recursive: true, force: true })
  const sd = path.join(dossier, 'etc', 'sudoers.d')
  fs.mkdirSync(sd, { recursive: true })
  const poser = (chemin, contenu, mode) => { fs.mkdirSync(path.dirname(chemin), { recursive: true }); fs.writeFileSync(chemin, contenu); fs.chmodSync(chemin, mode); fs.utimesSync(chemin, ANCIEN, ANCIEN) }
  const f90 = fixture('90-cloud-init-users')
  poser(path.join(sd, '90-cloud-init-users'), regleUsine === 'retiree' ? attendu90(f90) : f90, 0o440)
  for (const n of FICHIERS_INTACTS) poser(path.join(sd, n), fixture(n), 0o440)
  poser(path.join(dossier, 'etc', 'group'), groupes === 'propres' ? attenduGroup(fixture('group')) : fixture('group'), 0o644)
  let pw = fixture('passwd')
  if (gardien === 'present') {
    pw += 'gardien:x:1004:1004::/home/gardien:/bin/bash\n'
    poser(path.join(sd, 'presti-gardien'), `${LIGNE_GARDIEN}\n`, 0o440)
    const cles = [cleEtrangere, cle].filter(Boolean)
    poser(path.join(dossier, 'home', 'gardien', '.ssh', 'authorized_keys'), cles.length ? `${cles.join('\n')}\n` : '', 0o600)
    for (const d of [path.join(dossier, 'home', 'gardien'), path.join(dossier, 'home', 'gardien', '.ssh')]) fs.chmodSync(d, 0o700)
  }
  poser(path.join(dossier, 'etc', 'passwd'), pw, 0o644)
  if (rpcbind === 'coupe') poser(path.join(dossier, 'var', 'etat-rpcbind'), 'desactive\n', 0o644)
  return dossier
}

/** Instantané { chemin relatif → { type, sha, mode, mtime } } d'un arbre (liens compris, sans les suivre). */
export function instantane(dossier) {
  const out = new Map()
  const marcher = (d) => {
    for (const nom of fs.readdirSync(d).sort()) {
      const p = path.join(d, nom), st = fs.lstatSync(p), rel = path.relative(dossier, p).split(path.sep).join('/')
      if (st.isDirectory()) { out.set(rel, { type: 'dossier', mode: st.mode & 0o777 }); marcher(p) }
      else if (st.isFile()) out.set(rel, { type: 'fichier', sha: sha(fs.readFileSync(p)), mode: st.mode & 0o777, mtime: Math.round(st.mtimeMs) })
      else out.set(rel, { type: 'autre' })
    }
  }
  marcher(dossier)
  return out
}
/** Ce qui diffère entre deux instantanés : { ajoutes, retires, modifies } (contenu ou mode ; la date seule ne compte pas). */
export function difference(avant, apres) {
  const ajoutes = [], retires = [], modifies = []
  for (const [k, v] of apres) { const a = avant.get(k); if (!a) ajoutes.push(k); else if (a.sha !== v.sha || a.mode !== v.mode || a.type !== v.type) modifies.push(k) }
  for (const k of avant.keys()) if (!apres.has(k)) retires.push(k)
  return { ajoutes, retires, modifies }
}

// ── Les doublures de commandes (bash), écrites à l'exécution ───────────────────────────────────────────────────────────────
// %{ est remplacé par ${ à l'écriture (les gabarits JS mangeraient le dollar). Chaque doublure consigne ses arguments dans
// $ESSAI_JOURNAL (une ligne « nom<TAB>arg<TAB>arg »), puis, pour chaque argument qui est un fichier existant, une ligne
// « sha<TAB>chemin<TAB>sha256 » du contenu à cet instant (c'est ainsi que le juge sait ce que visudo a validé et ce que install pose).
const ENTETE = String.raw`#!/usr/bin/env bash
nom=$(basename "$0")
reel() { PATH="$ESSAI_PATH_REEL" "$@"; }
{ printf '%s' "$nom"; for a in "$@"; do printf '\t%s' "$a"; done; printf '\n'; } >>"$ESSAI_JOURNAL"
for a in "$@"; do if [ -f "$a" ]; then printf 'sha\t%s\t%s\n' "$a" "$(reel sha256sum <"$a" | cut -d' ' -f1)" >>"$ESSAI_JOURNAL"; fi; done
`
const SEULEMENT_JOURNAL = 'exit 0\n'
const DOUBLURES_SYSTEME = {
  visudo: String.raw`f=""
while [ $# -gt 0 ]; do case "$1" in -cf|-f) f="$2"; shift;; -c|-q|-s) ;; *) [ -z "$f" ] && f="$1";; esac; shift; done
if [ -z "$f" ] || [ ! -f "$f" ]; then echo "visudo: $f: No such file or directory" >&2; exit 1; fi
if grep -Ev '^[[:space:]]*(#.*)?$' "$f" | grep -Evq '^[[:space:]]*(Defaults.*|[%A-Za-z_][A-Za-z0-9_.@%-]*[[:space:]]+ALL[[:space:]]*=.*)$'; then echo "visudo: >>> $f : erreur de syntaxe <<<" >&2; exit 1; fi
echo "$f: parsed OK"
exit 0
`,
  install: String.raw`args=(); saut=0
for a in "$@"; do
  if [ $saut = 1 ]; then saut=0; continue; fi
  case "$a" in -o|-g|--owner|--group) saut=1;; --owner=*|--group=*) ;; *) args+=("$a");; esac
done
reel install "%{args[@]}"
`,
  gpasswd: String.raw`if [ "$1" != "-d" ] && [ "$1" != "--delete" ]; then echo "gpasswd (doublure) : seul -d <utilisateur> <groupe> est simulé" >&2; exit 2; fi
u="$2"; g="$3"; f="$ESSAI_RACINE/etc/group"
if ! grep -q "^$g:" "$f"; then echo "gpasswd: group '$g' does not exist in /etc/group" >&2; exit 3; fi
ligne=$(grep "^$g:" "$f"); membres=%{ligne##*:}
case ",$membres," in *",$u,"*) ;; *) echo "gpasswd: user '$u' is not a member of '$g'" >&2; exit 3;; esac
awk -F: -v OFS=: -v g="$g" -v u="$u" '$1==g{n=split($4,m,",");s="";for(i=1;i<=n;i++) if(m[i]!=u&&m[i]!=""){s=s (s==""?"":",") m[i]}; $4=s} {print}' "$f" >"$f.doublure" && cat "$f.doublure" >"$f"
rm -f "$f.doublure"
echo "Removing user $u from group $g"
exit 0
`,
  useradd: String.raw`u=""; cree=0
for a in "$@"; do case "$a" in -m|--create-home) cree=1;; esac; if printf '%s' "$a" | grep -Eq '^[a-z_][a-z0-9_-]*$'; then u="$a"; fi; done
f="$ESSAI_RACINE/etc/passwd"
if grep -q "^$u:" "$f"; then echo "useradd: user '$u' already exists" >&2; exit 9; fi
echo "$u:x:1004:1004::/home/$u:/bin/bash" >>"$f"
if [ $cree = 1 ]; then mkdir -p "$ESSAI_RACINE/home/$u"; chmod 700 "$ESSAI_RACINE/home/$u"; fi
exit 0
`,
  id: String.raw`pw="$ESSAI_RACINE/etc/passwd"; gr="$ESSAI_RACINE/etc/group"; mode=""; u=""
for a in "$@"; do case "$a" in -u|--user) mode=u;; -un|-nu) mode=un;; -nG|-Gn|-G|--groups) mode=G;; -n) ;; -*) ;; *) u="$a";; esac; done
if [ -z "$u" ]; then case "$mode" in u) echo 0;; un) echo root;; *) echo "uid=0(root) gid=0(root) groups=0(root)";; esac; exit 0; fi
ligne=$(grep "^$u:" "$pw")
if [ -z "$ligne" ]; then echo "id: '$u': no such user" >&2; exit 1; fi
uid=$(printf '%s' "$ligne" | cut -d: -f3)
case "$mode" in
  u) echo "$uid";;
  un) echo "$u";;
  G) awk -F: -v u="$u" 'BEGIN{s=u} {n=split($4,m,","); for(i=1;i<=n;i++) if(m[i]==u) s=s " " $1} END{print s}' "$gr";;
  *) echo "uid=$uid($u) gid=$uid($u)";;
esac
exit 0
`,
  getent: String.raw`base="$1"; cle="$2"
case "$base" in passwd) f="$ESSAI_RACINE/etc/passwd";; group) f="$ESSAI_RACINE/etc/group";; *) exit 2;; esac
if [ -z "$cle" ]; then cat "$f"; exit 0; fi
ligne=$(grep "^$cle:" "$f")
if [ -z "$ligne" ]; then exit 2; fi
echo "$ligne"; exit 0
`,
  systemctl: String.raw`etat="$ESSAI_RACINE/var/etat-rpcbind"; cmd=""; rpc=0
for a in "$@"; do case "$a" in -*) ;; rpcbind|rpcbind.service|rpcbind.socket) rpc=1;; *) [ -z "$cmd" ] && cmd="$a";; esac; done
case "$cmd" in
  disable|stop|mask) if [ $rpc = 1 ]; then mkdir -p "$(dirname "$etat")"; echo desactive >"$etat"; fi;;
  enable|start|unmask) if [ $rpc = 1 ]; then rm -f "$etat"; fi;;
  is-enabled) if [ -f "$etat" ]; then echo disabled; exit 1; fi; echo enabled; exit 0;;
  is-active) if [ -f "$etat" ]; then echo inactive; exit 3; fi; echo active; exit 0;;
esac
exit 0
`,
  findmnt: String.raw`if [ "$ESSAI_NFS" = 1 ]; then printf 'TARGET SOURCE FSTYPE OPTIONS\n/mnt/partage serveur:/export nfs4 rw,relatime\n'; exit 0; fi
exit 1
`,
  sudo: String.raw`args=("$@")
while [ %{#args[@]} -gt 0 ]; do case "%{args[0]}" in -n|-E|-H|-S|--non-interactive) args=("%{args[@]:1}");; -u) args=("%{args[@]:2}");; *) break;; esac; done
if [ %{#args[@]} -eq 0 ]; then exit 0; fi
exec "%{args[@]}"
`,
}
// Journalisées seulement : ce qu'un durcissement ne doit pas faire (ufw, écriture iptables, apt remove) ou ne fait pas (chown…).
const DOUBLURES_JOURNAL = ['ufw', 'iptables', 'ip6tables', 'nft', 'iptables-restore', 'netfilter-persistent', 'apt', 'apt-get', 'dpkg', 'snap', 'usermod', 'deluser', 'userdel', 'adduser', 'passwd', 'chown', 'chgrp', 'ssh-keygen']

/** Écrit les doublures du faux système dans <bin>. Rend la liste de leurs noms. */
export function ecrireDoublures(bin) {
  fs.mkdirSync(bin, { recursive: true })
  const ecrire = (nom, corps) => { const p = path.join(bin, nom); fs.writeFileSync(p, `${ENTETE}${corps}`.replaceAll('%{', '${')); fs.chmodSync(p, 0o755) }
  for (const [nom, corps] of Object.entries(DOUBLURES_SYSTEME)) ecrire(nom, corps)
  for (const nom of DOUBLURES_JOURNAL) ecrire(nom, SEULEMENT_JOURNAL)
  return [...Object.keys(DOUBLURES_SYSTEME), ...DOUBLURES_JOURNAL]
}

/** Le journal : [{ nom, args[], sha: { chemin → sha256 } }] dans l'ordre des appels. */
export function lireJournal(fichier) {
  const appels = []
  if (!fs.existsSync(fichier)) return appels
  for (const l of lf(fs.readFileSync(fichier, 'utf8')).split('\n')) {
    if (!l) continue
    const [nom, ...args] = l.split('\t')
    if (nom === 'sha' && appels.length) { appels[appels.length - 1].sha[args[0]] = args[1]; continue }
    appels.push({ nom, args, sha: {} })
  }
  return appels
}

// ── UD-3 : la préparation de usine.mjs sur une doublure de ssh ─────────────────────────────────────────────────────────────
// Côté PC : la doublure de `ssh` (en tête du PATH de usine.mjs) consigne ses arguments et enregistre le script reçu sur l'entrée
// standard. Pour usine@… elle EXÉCUTE ce script (bash -s) sous un faux HOME et un faux PATH où `sudo` refuse tout, comme sur une
// usine durcie (sudo -n true et sudo -n -l : « a password is required »), et rend son code ; pour gardien@… elle consigne et rend 0.
const SSH_DOUBLURE = String.raw`#!/usr/bin/env bash
{ printf 'ssh'; for a in "$@"; do printf '\t%s' "$a"; done; printf '\n'; } >>"$ESSAI_JOURNAL"
cible=""; cle=""; prec=""
for a in "$@"; do if [ "$prec" = "-i" ]; then cle="$a"; fi; case "$a" in *@*) [ -z "$cible" ] && cible="$a";; esac; prec="$a"; done
n=$(ls "$ESSAI_APPELS" 2>/dev/null | wc -l); script="$ESSAI_APPELS/appel-$n.sh"
cat >"$script"
printf 'appel\t%s\t%s\t%s\n' "$n" "$cible" "$cle" >>"$ESSAI_JOURNAL"
case "$cible" in
  usine@*) cd "$ESSAI_HOME_USINE" && exec env HOME="$ESSAI_HOME_USINE" PATH="$ESSAI_BIN_USINE:$ESSAI_PATH_REEL" bash -s <"$script";;
  gardien@*) exit 0;;
  *) echo "ssh (doublure) : hôte inattendu « $cible »" >&2; exit 255;;
esac
`
const DOUBLURES_USINE = {
  sudo: `echo "sudo: a password is required" >&2\nexit 1\n`,
  git: String.raw`case "$1" in log) echo "abc1234 essai (doublure git)";; status) ;; *) ;; esac
exit 0
`,
  npm: String.raw`if [ "$1" = ci ]; then mkdir -p node_modules; fi
exit 0
`,
  npx: 'exit 0\n',
  node: String.raw`case "$1" in -p) echo "1.55.0";; -e) echo "· chromium démarre : ok (doublure)"; echo "· webkit démarre : ok (doublure)";; esac
exit 0
`,
}
export function ecrireDoublesSsh({ bin, binUsine, homeUsine, homePc, appels }) {
  for (const d of [bin, binUsine, homeUsine, homePc, appels]) fs.mkdirSync(d, { recursive: true })
  const ecrire = (dossier, nom, corps, entete = ENTETE) => { const p = path.join(dossier, nom); fs.writeFileSync(p, `${entete}${corps}`); fs.chmodSync(p, 0o755) }
  ecrire(bin, 'ssh', '', SSH_DOUBLURE)
  ecrire(bin, 'scp', SEULEMENT_JOURNAL)
  for (const [nom, corps] of Object.entries(DOUBLURES_USINE)) ecrire(binUsine, nom, corps)
  fs.mkdirSync(path.join(homeUsine, 'presti'), { recursive: true })
  fs.writeFileSync(path.join(homeUsine, 'presti', 'package-lock.json'), '{"essai":true}\n')
}
