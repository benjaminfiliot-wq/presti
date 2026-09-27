#!/usr/bin/env bash
# scripts/usine/socle.sh — le socle des agents sur l'usine Oracle (fiche 026-050), rejouable sans rien casser.
#
# Envoyé par `node scripts/usine-agents.mjs socle` (le contenu de ce fichier sur l'entrée standard de `ssh … bash -s`,
# après `. "$HOME/.profile"`) : au premier passage, /srv/presti-agents n'existe pas encore, ce script vient donc du poste.
# Tout le reste s'installe DEPUIS l'arbre déployé, jamais depuis le poste.
#
# Ce qu'il pose :
#   - le compte agents (services des agents) : sans sudo, sans shell de connexion, dans aucun groupe sudo, adm ni admin ;
#     /home/agents, ~/.config/presti (le coffre) et ~/travail (chef, atelier, usine, surveillance) en 700, à agents ;
#   - /srv/presti-agents : arbre de travail détaché de ~usine/presti sur origin/main, à usine:agents, dossiers en 2750
#     (le bit setgid garde le groupe agents aux fichiers que git et npm créeront), fichiers en 640, exécutables en 750 :
#     agents lit le code, ne l'écrit jamais ; ses deux seuls endroits d'écriture passent par des liens vers ~agents/travail
#     (.orchestre/travail, et .orchestre/quotas.json que le chef tient, 026-127 ; ni l'un ni l'autre n'est suivi par git) ;
#   - /srv/playwright (usine:agents, 2750) : les navigateurs de Playwright, posés par `maj`, lisibles par agents ;
#   - /usr/local/bin/presti-coffre et presti-journal (root:root 755), copiés de /srv/presti-agents/scripts/usine/*.sh ;
#   - /etc/sudoers.d/presti-agents : usine ne peut lancer sous agents que ces deux assistants, rien d'autre ; le fichier
#     passe par un temporaire contrôlé par visudo avant d'être installé en 440.
# Il ne touche ni au pare-feu (celui d'Oracle, iptables-persistent), ni à sshd, et n'installe aucun paquet
# (voir « Pièges » de docs/agents/usine.md).
#
# Qui le lance : un compte qui a sudo sans mot de passe. Depuis le 25/09, usine ne l'a plus (presti-ops/usine/LISEZMOI.md,
# « Sudo restreint ») : les gestes root passent par ubuntu, même clé (PRESTI_USINE=ubuntu@<ip>). Les gestes du dépôt
# (git) tournent toujours sous usine, propriétaire de ~/presti et de l'arbre : directement si c'est lui qui lance, sinon
# par sudo -u usine. Codes : 0 fait ; 3 sudo refusé ; autre : l'étape en échec (set -e), rien n'est défait.
set -euo pipefail
umask 027
cd /

if [ "$(id -un)" = usine ]; then sous_usine=""; else sous_usine="sudo -n -u usine -H"; fi
if ! sudo -n true 2>/dev/null; then
  echo "✗ socle : sudo sans mot de passe refusé au compte $(id -un). Depuis le 25/09, les gestes root passent par ubuntu : PRESTI_USINE=ubuntu@<ip> node scripts/usine-agents.mjs socle" >&2
  exit 3
fi

# ── ~/presti avancé : l'arbre déployé ne suit que origin/main
echo "── dépôt : git fetch de /home/usine/presti"
$sous_usine git -C /home/usine/presti fetch --quiet origin

# ── le compte agents
if ! id agents >/dev/null 2>&1; then
  echo "── compte agents : création"
  sudo -n useradd --create-home --shell /usr/sbin/nologin agents
else
  echo "── compte agents : présent"
fi
sudo -n usermod --shell /usr/sbin/nologin agents
groupes_agents=" $(id -nG agents) "
case "$groupes_agents" in
  *" sudo "* | *" adm "* | *" admin "*)
    echo "✗ socle : le compte agents est dans un groupe d'administration ($groupes_agents) : à retirer à la main, sous ubuntu" >&2
    exit 1
    ;;
esac
sudo -n install -d -o agents -g agents -m 700 /home/agents /home/agents/.config /home/agents/.config/presti /home/agents/travail
sudo -n install -d -o agents -g agents -m 700 /home/agents/travail/chef /home/agents/travail/atelier /home/agents/travail/usine /home/agents/travail/surveillance
sudo -n chown agents:agents /home/agents /home/agents/.config/presti /home/agents/travail
sudo -n chmod 700 /home/agents /home/agents/.config/presti /home/agents/travail

# ── /srv/presti-agents : créé (vide, git le remplit) ou avancé sur origin/main
$sous_usine git -C /home/usine/presti worktree prune
if ! sudo -n test -e /srv/presti-agents/.git; then
  echo "── /srv/presti-agents : création sur origin/main"
  sudo -n install -d -o usine -g agents -m 2750 /srv/presti-agents
  $sous_usine git -C /home/usine/presti worktree add --detach /srv/presti-agents origin/main
else
  echo "── /srv/presti-agents : avancé sur origin/main"
  # --force : un fichier suivi modifié sur place revient à origin/main (seul le code poussé sur main tourne ici).
  $sous_usine git -C /srv/presti-agents checkout --quiet --force --detach origin/main
fi

# Les deux endroits où un agent écrit : des liens vers son dossier de travail (un vrai dossier à leur place : refus).
if sudo -n test -e /srv/presti-agents/.orchestre/travail -a ! -L /srv/presti-agents/.orchestre/travail; then
  echo "✗ socle : /srv/presti-agents/.orchestre/travail existe et n'est pas un lien : à examiner avant de relancer" >&2
  exit 1
fi
if sudo -n test -e /srv/presti-agents/.orchestre/quotas.json -a ! -L /srv/presti-agents/.orchestre/quotas.json; then
  echo "✗ socle : /srv/presti-agents/.orchestre/quotas.json existe et n'est pas un lien : à examiner avant de relancer" >&2
  exit 1
fi
$sous_usine ln -sfn /home/agents/travail /srv/presti-agents/.orchestre/travail
$sous_usine ln -sfn /home/agents/travail/quotas.json /srv/presti-agents/.orchestre/quotas.json

# Les droits : usine:agents ; rien d'inscriptible par le groupe ni par les autres (find ne suit pas les liens).
sudo -n chown -R usine:agents /srv/presti-agents
sudo -n find /srv/presti-agents -type d -exec chmod 2750 {} +
sudo -n find /srv/presti-agents -type f -perm /u+x -exec chmod 750 {} +
sudo -n find /srv/presti-agents -type f ! -perm /u+x -exec chmod 640 {} +

# ── /srv/playwright : les navigateurs, installés par maj sous usine, lus par agents
sudo -n install -d -o usine -g agents -m 2750 /srv/playwright

# ── les deux assistants, depuis l'arbre déployé
sudo -n install -o root -g root -m 755 /srv/presti-agents/scripts/usine/presti-coffre.sh /usr/local/bin/presti-coffre
sudo -n install -o root -g root -m 755 /srv/presti-agents/scripts/usine/presti-journal.sh /usr/local/bin/presti-journal

# ── le sudoers : exactement deux règles, contrôlées avant d'être posées
regles=$(mktemp)
trap 'rm -f "$regles"' EXIT
cat > "$regles" <<'FIN'
usine ALL=(agents) NOPASSWD: /usr/local/bin/presti-coffre
usine ALL=(agents) NOPASSWD: /usr/local/bin/presti-journal
FIN
sudo -n visudo -cf "$regles"
sudo -n install -o root -g root -m 440 "$regles" /etc/sudoers.d/presti-agents
rm -f "$regles"

echo "── socle posé : agents $(id agents)"
echo "   déployé : $($sous_usine git -C /srv/presti-agents rev-parse HEAD)"
echo "   ensuite : node scripts/usine-agents.mjs maj (dépendances et navigateurs), puis installer <groupe>"
