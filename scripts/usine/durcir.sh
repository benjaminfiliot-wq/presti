#!/usr/bin/env bash
set -euo pipefail
# scripts/usine/durcir.sh — durcit l'usine (fiche 026-197, décision 5 de Benj du 25/09) : le compte `usine` (celui de Codex) perd
# le sudo sans mot de passe et le groupe docker ; un compte `gardien`, joignable par la seule clé du poste, garde le sudo.
#
#   bash durcir.sh [--racine-systeme=<dossier>] "<clé publique ssh du gardien>"
#
# Lancé SOUS `gardien` sur l'usine (ssh -i ~/.ssh/presti-usine-gardien gardien@<hôte> 'bash -s' < durcir.sh …), jamais sous `usine`.
# --racine-systeme : racine d'un faux système de fichiers (le juge usine-durcie-qa l'utilise) ; sans elle, le vrai système.
# Idempotent : sur un état déjà durci il ne change rien et le dit. Aucun ufw, aucune écriture iptables, aucun apt remove.
#
# ORDRE (le garde-fou de la fiche) : 1. le gardien, sa clé, sa règle sudo ; 2. la vérification que le gardien FONCTIONNE ;
# 3. SEULEMENT ENSUITE le retrait des droits de `usine`. Si la vérification échoue, rien n'est retiré (code 4).
# Sur le vrai système, le retrait n'a lieu que lancé par le gardien lui-même : une session ouverte avec la clé du poste prouve
# que cette clé marche ; lancé par un autre compte, le script pose le gardien puis s'arrête (code 5) sans rien retirer.

R=""
cle=""
for a in "$@"; do
  case "$a" in
    --racine-systeme=*) R="${a#--racine-systeme=}"; R="${R%/}" ;;
    -*) echo "✗ option inconnue : $a" >&2; exit 2 ;;
    *) if [ -n "$cle" ]; then echo "✗ une seule clé publique attendue" >&2; exit 2; fi; cle="$a" ;;
  esac
done
[ -n "$cle" ] || { echo "usage : durcir.sh [--racine-systeme=<dossier>] \"<clé publique>\"" >&2; exit 2; }
case "$cle" in *PRIVATE*) echo "✗ ceci ressemble à une clé PRIVÉE : refusé (seule la clé publique passe sur l'usine)" >&2; exit 2 ;; esac
case "$cle" in ssh-ed25519\ *|ssh-rsa\ *|ecdsa-sha2-*\ *) ;; *) echo "✗ clé publique ssh attendue (ssh-ed25519 AAAA… commentaire)" >&2; exit 2 ;; esac
case "$cle" in *$'\n'*) echo "✗ une clé sur une seule ligne" >&2; exit 2 ;; esac

SUDO=""
if [ "$(id -u)" != 0 ]; then SUDO="sudo -n"; fi
SD="$R/etc/sudoers.d"
F90="$SD/90-cloud-init-users"
FG="$SD/presti-gardien"
HG="$R/home/gardien"
AK="$HG/.ssh/authorized_keys"
LIGNE_USINE='usine ALL=(ALL) NOPASSWD:ALL'
LIGNE_GARDIEN='gardien ALL=(ALL) NOPASSWD:ALL'
CHANGES=0
T=$(mktemp -d)
trap 'rm -rf "$T"' EXIT
note() { echo "· $*"; }
change() { CHANGES=$((CHANGES + 1)); echo "+ $*"; }

if [ "$(id -un)" = usine ]; then
  echo "✗ lancé sous le compte usine : il perdrait ses droits en cours de route. Passe par gardien." >&2
  exit 2
fi
if [ -n "$SUDO" ]; then $SUDO true || { echo "✗ le sudo de ce compte ne marche pas : rien n'est fait" >&2; exit 4; }; fi

# Pose un fichier sudoers : fichier temporaire, visudo -cf, puis install -m 440 (jamais d'édition sur place).
poser_sudoers() { # $1 = contenu du fichier temporaire, $2 = destination
  $SUDO visudo -cf "$1" >/dev/null || { echo "✗ visudo refuse $2 : rien n'est posé" >&2; exit 4; }
  $SUDO install -m 440 "$1" "$2"
}

# ── 1. le gardien, sa clé, sa règle ────────────────────────────────────────────────────────────────────────────
if getent passwd gardien >/dev/null 2>&1; then
  note "gardien existe déjà"
else
  $SUDO useradd --create-home --shell /bin/bash gardien
  change "compte gardien créé"
fi

attendu_cle="$T/cle.attendue"
printf '%s\n' "$cle" >"$attendu_cle"
if [ -f "$AK" ] && [ "$($SUDO cat "$AK")" = "$cle" ]; then
  note "authorized_keys du gardien : la seule clé attendue, déjà en place"
else
  $SUDO install -d -m 700 -o gardien -g gardien "$HG/.ssh"
  $SUDO install -m 600 -o gardien -g gardien "$attendu_cle" "$AK"
  change "authorized_keys du gardien : la seule clé du poste"
fi

printf '%s\n' "$LIGNE_GARDIEN" >"$T/presti-gardien"
if $SUDO test -f "$FG" && [ "$($SUDO cat "$FG")" = "$LIGNE_GARDIEN" ]; then
  note "règle presti-gardien déjà en place"
else
  poser_sudoers "$T/presti-gardien" "$FG"
  change "règle presti-gardien posée"
fi

# ── 2. le gardien fonctionne-t-il ? (avant tout retrait) ───────────────────────────────────────────────────────
getent passwd gardien >/dev/null 2>&1 || { echo "✗ gardien n'existe pas : rien n'est retiré" >&2; exit 4; }
[ "$($SUDO cat "$AK")" = "$cle" ] || { echo "✗ la clé du gardien n'est pas celle attendue : rien n'est retiré" >&2; exit 4; }
[ "$($SUDO cat "$FG")" = "$LIGNE_GARDIEN" ] || { echo "✗ la règle sudo du gardien n'est pas en place : rien n'est retiré" >&2; exit 4; }
$SUDO visudo -cf "$FG" >/dev/null || { echo "✗ la règle sudo du gardien ne passe pas visudo : rien n'est retiré" >&2; exit 4; }
note "gardien vérifié : compte, clé unique, règle sudo valide"
if [ -z "$R" ] && [ "$(id -un)" != gardien ]; then
  echo "! gardien posé, mais ce script n'est pas lancé PAR gardien : aucun droit de usine n'est retiré." >&2
  echo "  Vérifie la clé du poste (ssh -i ~/.ssh/presti-usine-gardien gardien@<hôte> 'sudo -n true'), puis relance durcir.sh sous gardien." >&2
  exit 5
fi

# ── 3. le retrait des droits de usine ──────────────────────────────────────────────────────────────────────────
if $SUDO test -f "$F90" && $SUDO grep -qxF "$LIGNE_USINE" "$F90"; then
  $SUDO grep -vxF "$LIGNE_USINE" "$F90" >"$T/90" || true
  poser_sudoers "$T/90" "$F90"
  change "90-cloud-init-users : la ligne « $LIGNE_USINE » retirée (les autres lignes intactes)"
else
  note "90-cloud-init-users : la ligne usine n'y est déjà plus"
fi

for g in sudo docker; do
  if getent group "$g" >/dev/null 2>&1 && id -nG usine 2>/dev/null | tr ' ' '\n' | grep -qx "$g"; then
    $SUDO gpasswd -d usine "$g"
    change "usine retiré du groupe $g"
  else
    note "usine n'est déjà plus dans le groupe $g"
  fi
done

# rpcbind : coupé seulement si aucun partage NFS n'est monté.
nfs=$(findmnt -t nfs,nfs4 2>/dev/null || true)
if [ -n "$nfs" ]; then
  note "partage NFS monté : rpcbind laissé en place"
elif systemctl is-enabled rpcbind rpcbind.socket >/dev/null 2>&1; then
  $SUDO systemctl disable --now rpcbind rpcbind.socket
  change "rpcbind désactivé (aucun NFS monté)"
else
  note "rpcbind déjà désactivé (ou absent)"
fi

if [ "$CHANGES" -eq 0 ]; then
  echo "✓ déjà durci : rien à changer"
else
  echo "✓ durci : $CHANGES changement(s)"
fi
