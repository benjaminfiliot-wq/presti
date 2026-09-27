#!/usr/bin/env bash
# TÉMOIN du juge usine-socle-qa (026-048) : le script distant du socle, minimal, écrit par Claude Code pour prouver que le
# juge sait passer au vert. Ce n'est PAS le livrable de 026-050. Lancé par usine (bash -s), rejouable.
set -euo pipefail

# Le compte agents : sans sudo, sans shell de connexion.
if ! id agents >/dev/null 2>&1; then
  sudo -n useradd --create-home --shell /usr/sbin/nologin agents
fi
sudo -n chmod 700 /home/agents
sudo -n install -d -o agents -g agents -m 700 /home/agents/.config /home/agents/.config/presti /home/agents/travail
sudo -n install -d -o agents -g agents -m 700 /home/agents/travail/{chef,atelier,usine,surveillance}

# Le code déployé : un arbre détaché de ~/presti sur origin/main.
git -C "$HOME/presti" fetch -q origin
if [ ! -e /srv/presti-agents/.git ]; then
  sudo -n install -d -o usine -g agents -m 750 /srv/presti-agents
  git -C "$HOME/presti" worktree add --detach /srv/presti-agents origin/main
else
  git -C /srv/presti-agents checkout -q --detach origin/main
fi
sudo -n chown -R usine:agents /srv/presti-agents
chmod -R u=rwX,g=rX,o= /srv/presti-agents
ln -sfn /home/agents/travail /srv/presti-agents/.orchestre/travail
ln -sfn /home/agents/travail/quotas.json /srv/presti-agents/.orchestre/quotas.json

# Les deux assistants, depuis l'arbre déployé.
sudo -n install -o root -g root -m 755 /srv/presti-agents/scripts/usine/presti-coffre.sh /usr/local/bin/presti-coffre
sudo -n install -o root -g root -m 755 /srv/presti-agents/scripts/usine/presti-journal.sh /usr/local/bin/presti-journal

# Le sudoers : un temporaire contrôlé avant d'être installé.
SUDOERS_TMP=$(mktemp)
cat >"$SUDOERS_TMP" <<'REGLES'
usine ALL=(agents) NOPASSWD: /usr/local/bin/presti-coffre
usine ALL=(agents) NOPASSWD: /usr/local/bin/presti-journal
REGLES
sudo -n visudo -cf "$SUDOERS_TMP"
sudo -n install -o root -g root -m 440 "$SUDOERS_TMP" /etc/sudoers.d/presti-agents
rm -f "$SUDOERS_TMP"
echo "socle posé : $(git -C /srv/presti-agents rev-parse --short HEAD)"
