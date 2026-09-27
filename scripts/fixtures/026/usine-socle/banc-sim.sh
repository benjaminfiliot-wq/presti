# scripts/fixtures/026/usine-socle/banc-sim.sh — le banc de simulation du juge usine-socle-qa (026-048, réparation du 27/09).
#
# Placé par le juge EN TÊTE d'un script distant (socle.sh, ou ce que usine-agents.mjs envoie à ssh pour maj, installer,
# arreter), dont les chemins absolus (/etc, /srv, /home, /usr, /var, /opt) ont été remis sous $SIM_RACINE. Chaque commande
# système est remplacée par une fonction qui consigne son appel dans $SIM_JOURNAL (une ligne : compte sudo, commande,
# arguments, séparés par \037) et ne touche jamais rien hors de $SIM_RACINE. Le juge relit ce journal : ce que le script a
# FAIT, et non ce qu'il contient (revue Codex du 27/09 : une condition inversée passait la lecture du texte).
# État simulé : SIM_AGENTS (absent | present : le compte agents), SIM_MOI (le compte connecté, ubuntu par défaut),
# SIM_ACTIFS (les services presti-* en marche, séparés par des blancs).
export PATH="/usr/bin:/bin:$PATH"
__j() { local IFS=$'\037'; printf '%s\n' "${SIM_SOUS:-}$IFS$*" >> "$SIM_JOURNAL"; }
__dans() { case "${1:-}" in "$SIM_RACINE"/*) return 0 ;; *) return 1 ;; esac; }
# sudo : ses options lues (-u compte), puis la commande, qui est elle-même une doublure (ou un builtin : test, true).
sudo() {
  local u=root
  while [ $# -gt 0 ]; do
    case "$1" in
      -u) u=$2; shift 2 ;;
      -g|-C|-D|-h|-p|-r|-t|-U) shift 2 ;;
      --) shift; break ;;
      -*) shift ;;
      *) break ;;
    esac
  done
  [ $# -gt 0 ] || return 0
  SIM_SOUS=$u "$@"
}
id() {
  __j id "$@"
  local dernier=""
  [ $# -gt 0 ] && dernier=${!#}
  case "$*" in
    -un|"-u -n"|-nu) echo "${SIM_MOI:-ubuntu}"; return 0 ;;
    -u) echo 1001; return 0 ;;
  esac
  if [ "$dernier" = agents ]; then
    if [ "${SIM_AGENTS:-absent}" != present ]; then echo "id: 'agents': no such user" >&2; return 1; fi
    case "${1:-}" in
      -nG|-Gn) echo agents ;;
      -u|-g) echo 1002 ;;
      *) echo "uid=1002(agents) gid=1002(agents) groups=1002(agents)" ;;
    esac
    return 0
  fi
  echo "uid=1001(${SIM_MOI:-ubuntu}) gid=1001(${SIM_MOI:-ubuntu})"
}
getent() {
  __j getent "$@"
  if [ "${1:-}" = passwd ] && [ "${2:-}" = agents ]; then
    [ "${SIM_AGENTS:-absent}" = present ] || return 2
    echo "agents:x:1002:1002::/home/agents:/usr/sbin/nologin"
    return 0
  fi
  return 2
}
useradd() { __j useradd "$@"; SIM_AGENTS=present; }
adduser() { __j adduser "$@"; SIM_AGENTS=present; }
for __c in usermod userdel groupadd groupmod gpasswd groupmems passwd chpasswd chown chgrp chmod setfacl ln visudo rm cp mv touch \
  npm npx env systemd-analyze apt apt-get dpkg snap curl wget ufw iptables iptables-save netfilter-persistent mount su runuser; do
  eval "$__c() { __j $__c \"\$@\"; }"
done
unset __c
git() {
  __j git "$@"
  case " $* " in *" rev-parse "*) echo 0123456789abcdef0123456789abcdef01234567 ;; esac
  return 0
}
tee() { __j tee "$@"; /usr/bin/cat >/dev/null; }
cmp() { __j cmp "$@"; return 1; }
sha256sum() { __j sha256sum "$@"; printf '%s  %s\n' 0000000000000000000000000000000000000000000000000000000000000000 "${!#}"; }
sort() { /usr/bin/sort "$@"; }
mkdir() {
  __j mkdir "$@"
  local a
  for a in "$@"; do case "$a" in -*) ;; *) __dans "$a" && /usr/bin/mkdir -p -- "$a" ;; esac; done
  return 0
}
# install : consigné ; -d crée le dossier sous la racine du banc ; sinon copie pour de vrai, sous la racine du banc seulement
# (les unités copiées sont ensuite trouvées par [ -e ] et par les motifs du script, comme sur l'usine).
install() {
  __j install "$@"
  local d=0 args=() a
  while [ $# -gt 0 ]; do
    case "$1" in
      -d|--directory) d=1; shift ;;
      -m|-o|-g|--mode|--owner|--group|-t|--target-directory) shift 2 ;;
      --*) shift ;;
      -*) case "$1" in -*d*) d=1 ;; esac; shift ;;
      *) args+=("$1"); shift ;;
    esac
  done
  if [ "$d" = 1 ]; then
    for a in "${args[@]}"; do __dans "$a" && /usr/bin/mkdir -p -- "$a"; done
    return 0
  fi
  [ "${#args[@]}" -ge 2 ] || return 0
  local dest=${args[-1]} src
  __dans "$dest" || return 0
  for src in "${args[@]:0:${#args[@]}-1}"; do
    [ -f "$src" ] || continue
    if [ -d "$dest" ]; then /usr/bin/cp -- "$src" "$dest/" 2>/dev/null || true; else /usr/bin/cp -- "$src" "$dest" 2>/dev/null || true; fi
  done
  return 0
}
# find : consigné ; lancé pour de vrai (lecture seule) sous la racine du banc ; jamais avec -exec, -delete ou -ok.
find() {
  __j find "$@"
  case " $* " in *" -exec "*|*" -execdir "*|*" -delete "*|*" -ok "*|*" -okdir "*) return 0 ;; esac
  __dans "${1:-}" || return 0
  /usr/bin/find "$@"
}
systemctl() {
  __j systemctl "$@"
  local a x
  for a in "$@"; do
    case "$a" in
      list-units) for x in ${SIM_ACTIFS:-}; do printf '%s loaded active running essai\n' "$x"; done; return 0 ;;
      is-active) if [ -n "${SIM_ACTIFS:-}" ]; then echo active; return 0; fi; echo inactive; return 3 ;;
      list-timers) return 0 ;;
    esac
  done
  return 0
}
