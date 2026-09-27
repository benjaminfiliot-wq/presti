#!/bin/sh
# TÉMOIN de chef-qa (026-102) — lancé sous chef-modele par le juge (026-148, CH-R7 et CH-R9).
# N'écrit que des codes, jamais le contenu d'un fichier : toute lecture va à /dev/null.
if cat /home/agents/.config/presti/agents.env >/dev/null 2>&1; then coffre=lu; else coffre=refuse; fi
if ls /home/agents >/dev/null 2>&1; then home=lu; else home=refuse; fi
if /opt/codex/bin/codex sandbox -P :workspace -C /srv/presti-chef/echange -- cat /home/agents/.config/presti/agents.env >/dev/null 2>&1; then bac=lu; else bac=refuse; fi
conf=/home/chef-modele/.codex/config.toml
mode=$(sed -n 's/^sandbox_mode *= *"\([a-z-]*\)".*/\1/p' "$conf" 2>/dev/null | head -n 1)
reseau=ouvert
if grep -Eq '^network_access *= *false' "$conf" 2>/dev/null; then reseau=coupe; fi
modele=$(sed -n 's/^model *= *"\([a-z0-9.-]*\)".*/\1/p' "$conf" 2>/dev/null | head -n 1)
echo "coffre=$coffre home=$home bac=$bac"
echo "config=${mode:-absent} reseau=$reseau modele=${modele:-absent}"
