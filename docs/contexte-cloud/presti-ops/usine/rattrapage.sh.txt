#!/usr/bin/env bash
# Rattrapage de l'usine : rejoue ce que cloud-init n'a pas pu faire au premier demarrage.
# Cas du 24/09/2026 : l'assistant Oracle a cree l'instance SANS IP publique (VCN neuf) ; tant qu'elle n'en avait pas,
# apt n'atteignait aucun depot, donc les paquets de cloud-init.yaml n'ont pas ete installes.
# Idempotent : on peut le relancer sans risque. Lance par : ssh -i ~/.ssh/presti-usine ubuntu@<IP> 'bash -s' < rattrapage.sh
# (sous ubuntu : depuis le 25/09/2026, usine n'a plus de sudo complet ; voir LISEZMOI.md, "Sudo restreint").
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

sudo apt-get update -q
sudo apt-get -y -q -o Dpkg::Options::=--force-confold upgrade
# Meme liste que cloud-init.yaml (sans ufw : voir le commentaire du pare-feu dans cloud-init.yaml).
sudo apt-get install -y -q git curl ca-certificates fail2ban unattended-upgrades ffmpeg python3-venv build-essential jq

sudo systemctl enable --now fail2ban
sudo systemctl restart fail2ban

echo "--- verification"
for p in git curl fail2ban unattended-upgrades ffmpeg python3-venv build-essential jq iptables-persistent; do
  dpkg -s "$p" >/dev/null 2>&1 && echo "ok $p" || { echo "MANQUE $p"; exit 1; }
done
systemctl is-active fail2ban
sudo fail2ban-client status sshd | sed -n '1,4p'
sudo iptables -S INPUT | grep -- '--dport 22' >/dev/null && echo "pare-feu Oracle ok (SSH seul en entree)"
[ -f /var/run/reboot-required ] && echo "REDEMARRAGE REQUIS" || echo "pas de redemarrage requis"
echo "rattrapage fini $(date -Is)" | sudo tee -a /var/log/usine-prete.log
