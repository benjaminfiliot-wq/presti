# L'usine durcie : le compte `usine` n'a plus de root

Décision 5 de Benj (25/09/2026), fiche 026-197. Codex tourne sur l'usine sous le compte `usine`, avec le réseau, et lit du texte
qu'il ne maîtrise pas (fiches, code tiers). Un sudo sans mot de passe ou le groupe `docker` valent root : une injection dans une
fiche aurait pu lire le coffre des agents ou la connexion Codex de `chef-modele`. Le bac à sable de Codex borne l'écriture, pas la
lecture. D'où le durcissement.

## Ce que change le durcissement

| Compte | Avant | Après |
|---|---|---|
| `usine` (Codex, `scripts/usine.mjs`) | `usine ALL=(ALL) NOPASSWD:ALL` (cloud-init, `/etc/sudoers.d/90-cloud-init-users`), groupes `sudo` et `docker` | aucun sudo, ni `sudo` ni `docker` ; seules restent les règles étroites `presti-coffre` et `presti-journal` (vers `agents`, fichier `presti-agents`) et `presti-chef-modele-essai` (vers `chef-modele`) |
| `gardien` | n'existe pas | sudo sans mot de passe (`/etc/sudoers.d/presti-gardien`), joignable par **une seule clé publique**, celle du poste |

La clé privée `~/.ssh/presti-usine-gardien` vit sur le PC et **ne le quitte jamais** : jamais copiée sur l'usine, jamais utilisée
pour joindre `usine`, jamais lue par `usine.mjs` (sauf pour `preparer --dependances`, sur l'ordre de Claude Code) ni par Codex.

## `scripts/usine/durcir.sh <clé publique>`

Lancé **sous `gardien`** (`ssh -i ~/.ssh/presti-usine-gardien gardien@<hôte> 'bash -s' < scripts/usine/durcir.sh` avec la clé publique
en argument ; ou copié puis lancé). Idempotent : sur un état déjà durci il ne change rien et le dit (« déjà durci : rien à changer »).

Ordre du script, qui est son garde-fou :

1. créer `gardien` s'il manque, `authorized_keys` en 600 avec la seule clé passée en argument, `presti-gardien` (fichier temporaire,
   `visudo -cf`, `install -m 440`) ;
2. **vérifier que le gardien fonctionne** : compte présent, clé unique, règle sudo valide. Sinon code 4, **rien n'est retiré** ;
3. seulement ensuite, retirer à `usine` ses droits : la seule ligne `usine ALL=(ALL) NOPASSWD:ALL` de `90-cloud-init-users` (fichier
   temporaire, `visudo -cf`, `install -m 440`), `gpasswd -d usine sudo`, `gpasswd -d usine docker` ;
4. `rpcbind` désactivé (`systemctl disable --now rpcbind rpcbind.socket`) seulement si `findmnt -t nfs,nfs4` est vide.

Sur le vrai système, l'étape 3 n'a lieu que si le script est lancé **par le compte `gardien`** : une session ouverte avec la clé du
poste prouve que cette clé marche. Lancé par un autre compte, il pose le gardien puis s'arrête (code 5), sans rien retirer.
Le script refuse aussi de tourner sous `usine` et refuse une clé privée.

Jamais : `ufw` (il coupe l'accès à l'usine : les règles d'Oracle passent par `iptables`, qu'on ne touche pas), écriture `iptables`,
`apt remove`. Les fichiers `presti-agents` et `presti-chef-modele*` ne sont pas touchés.

## Toute commande root passe désormais par `gardien`

```
ssh -i ~/.ssh/presti-usine-gardien gardien@<hôte> 'sudo -n <commande>'
```

- freellmapi (`127.0.0.1:3001`) se gère par `sudo docker compose …` **sous `gardien`**, plus sous `usine`.
- Les bibliothèques système de Playwright : `node scripts/usine.mjs preparer --dependances` (par `gardien`, sur l'ordre de Claude
  Code). `preparer` seul n'appelle plus `--with-deps` ni sudo : il télécharge les navigateurs dans `~/.cache/ms-playwright` et
  vérifie qu'ils démarrent ; s'il manque des bibliothèques, il le dit et renvoie vers `--dependances`.
- Toute installation root d'une fiche future (unité, paquet, règle) passe par `gardien`. Aucune fiche ne reçoit cette clé.

## Preuves et vérification

- Juge : `node scripts/usine-durcie-qa.mjs` (UD-1, UD-2a à UD-2i dans un faux système de fichiers, UD-3 sur une doublure de ssh) ;
  `--reel` ajoute UD-R, qui n'est jouable que depuis le poste, avec les clés `presti-usine` et `presti-usine-gardien`.
- `.orchestre/preuves/026-197/durcissement.md` : unités `presti-*`, `iptables -S INPUT`, `ss -ltn` et écoutes attendues **avant**,
  puis **après**, le « oui » de Benj et sa date, chaque commande lancée. UD-R le relit.

## À constater le jour J (non vérifié depuis ce dépôt)

- Que cloud-init ne repose pas la règle au redémarrage (module `users-groups`, par instance). Sinon, poser
  `/etc/cloud/cloud.cfg.d/99-presti.cfg` qui la neutralise, et le noter dans `durcissement.md`.
- Si Benj a demandé l'arrêt du Studio Claw3D, le constater (`ss -ltn`, écoutes 3000).
- L'IP publique grisée dans la console Oracle n'est pas une panne.
