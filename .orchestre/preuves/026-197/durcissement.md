# 026-197 — durcissement de l'usine, 05/10/2026

Oui de Benj au compte gardien et au retrait du sudo/docker de usine : D-0410-15 (2), réponse de Benj du 05/10 (nuit).
Le sudo de usine était déjà retiré (préalable de 026-179) ; le groupe docker restait. Le gardien existait déjà (clé du poste seule).

## Avant (05/10 ~01 h, Paris)
```
uid=1000(usine) gid=1000(usine) groups=1000(usine),107(docker)
  presti-surveillance.service loaded active running Presti — surveillance de l'usine
--- ss -ltn
State  Recv-Q Send-Q Local Address:Port  Peer Address:PortProcess
LISTEN 0      4096         0.0.0.0:22         0.0.0.0:*          
LISTEN 0      4096         0.0.0.0:111        0.0.0.0:*          
LISTEN 0      4096       127.0.0.1:18800      0.0.0.0:*          
LISTEN 0      10         127.0.0.1:35741      0.0.0.0:*          
LISTEN 0      4096       127.0.0.1:3001       0.0.0.0:*          
LISTEN 0      4096   127.0.0.53%lo:53         0.0.0.0:*          
LISTEN 0      511        127.0.0.1:4311       0.0.0.0:*          
LISTEN 0      10         127.0.0.1:38857      0.0.0.0:*          
LISTEN 0      4096      127.0.0.54:53         0.0.0.0:*          
LISTEN 0      511        127.0.0.1:43455      0.0.0.0:*          
LISTEN 0      4096       127.0.0.1:11434      0.0.0.0:*          
LISTEN 0      512        127.0.0.1:44421      0.0.0.0:*          
LISTEN 0      4096       127.0.0.1:41801      0.0.0.0:*          
LISTEN 0      511        127.0.0.1:42085      0.0.0.0:*          
LISTEN 0      10         127.0.0.1:42047      0.0.0.0:*          
LISTEN 0      511        127.0.0.1:45783      0.0.0.0:*          
LISTEN 0      4096            [::]:22            [::]:*          
LISTEN 0      4096            [::]:111           [::]:*          
--- iptables -S INPUT (sous gardien)
-P INPUT ACCEPT
-A INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT
-A INPUT -p icmp -j ACCEPT
-A INPUT -i lo -j ACCEPT
-A INPUT -p tcp -m state --state NEW -m tcp --dport 22 -j ACCEPT
-A INPUT -j REJECT --reject-with icmp-host-prohibited
--- gardien
gardien
sudo-gardien-ok
ls: cannot open directory '/etc/sudoers.d/': Permission denied
0
active
```

Note : le fichier du poste est en CRLF (autocrlf) : un premier essai a échoué sans rien changer (set -o pipefail refusé, code 2). Les passages ci-dessous envoient le script par tr -d '\r'.

## Commande 1 : durcir.sh sous gardien (premier passage)
```
· gardien existe déjà
· authorized_keys du gardien : la seule clé attendue, déjà en place
+ règle presti-gardien posée
· gardien vérifié : compte, clé unique, règle sudo valide
· 90-cloud-init-users : la ligne usine n'y est déjà plus
· usine n'est déjà plus dans le groupe sudo
Removing user usine from group docker
+ usine retiré du groupe docker
Synchronizing state of rpcbind.service with SysV service script with /usr/lib/systemd/systemd-sysv-install.
Executing: /usr/lib/systemd/systemd-sysv-install disable rpcbind
Removed "/etc/systemd/system/sockets.target.wants/rpcbind.socket".
Removed "/etc/systemd/system/multi-user.target.wants/rpcbind.service".
Disabling 'rpcbind.service', but its triggering units are still active:
rpcbind.socket
+ rpcbind désactivé (aucun NFS monté)
✓ durci : 3 changement(s)
code=0
```

## Commande 2 : second passage (idempotence)
```
· gardien existe déjà
· authorized_keys du gardien : la seule clé attendue, déjà en place
+ règle presti-gardien posée
· gardien vérifié : compte, clé unique, règle sudo valide
· 90-cloud-init-users : la ligne usine n'y est déjà plus
· usine n'est déjà plus dans le groupe sudo
· usine n'est déjà plus dans le groupe docker
· rpcbind déjà désactivé (ou absent)
✓ durci : 1 changement(s)
code=0
```

Correction faite pendant la reprise (vraie faute de durcir.sh, dans le périmètre) : `[ -f $FG ]` et `[ -f $F90 ]` étaient évalués sous gardien, qui ne peut pas lire /etc/sudoers.d (dossier 750 root) : le test rendait toujours faux (la règle gardien était réécrite à chaque passage, et la ligne usine de 90-cloud-init-users aurait été annoncée « déjà absente » même présente). Remplacés par `$SUDO test -f`. Constat direct sous gardien (sudo -n grep) : la ligne usine n'est plus dans 90-cloud-init-users, ni ailleurs (il reste usine-restreint : la seule commande exacte de apt-get de Playwright, voulue le 25/09), et le fichier date du 25/09 alors que l'hôte tourne depuis plus d'une semaine : cloud-init ne l'a pas reposé au redémarrage.

## Commande 3 : troisième passage avec le script corrigé
```
· gardien existe déjà
· authorized_keys du gardien : la seule clé attendue, déjà en place
· règle presti-gardien déjà en place
· gardien vérifié : compte, clé unique, règle sudo valide
· 90-cloud-init-users : la ligne usine n'y est déjà plus
· usine n'est déjà plus dans le groupe sudo
· usine n'est déjà plus dans le groupe docker
· rpcbind déjà désactivé (ou absent)
✓ déjà durci : rien à changer
code=0
```

## Après
```
uid=1000(usine) gid=1000(usine) groups=1000(usine)
usine-sans-sudo
permission denied while trying to connect to the docker API at unix:///var/run/docker.sock
17
-P INPUT ACCEPT
-A INPUT -m state --state RELATED,ESTABLISHED -j ACCEPT
-A INPUT -p icmp -j ACCEPT
-A INPUT -i lo -j ACCEPT
-A INPUT -p tcp -m state --state NEW -m tcp --dport 22 -j ACCEPT
-A INPUT -j REJECT --reject-with icmp-host-prohibited
hermes Up 6 days (healthy)
hermes-relais Up 6 days
openclaw-relais Up 6 days
openclaw Up 12 hours (healthy)
freellmapi-freellmapi-1 Up 9 days (healthy)
inactive
```
