# 026-197 — ce qui manque (et ne peut pas être fait depuis un conteneur cloud)

Fait ici, vérifié par `node scripts/usine-durcie-qa.mjs` sans `--reel` (voir `verifier.log`) : `scripts/usine/durcir.sh`,
l'adaptation de `scripts/usine.mjs` (UD-3), `docs/agents/usine-durcie.md`.

**Pas fait, et aucun `durcissement.md` n'est écrit** : le mode `--reel` (UD-R) exige un accès ssh à l'usine avec les deux clés du
poste (`~/.ssh/presti-usine` et `~/.ssh/presti-usine-gardien`). Ce conteneur n'a ni l'une ni l'autre, ni l'usine. Un
`durcissement.md` écrit ici serait inventé ; UD-R le relit et le compare à l'usine réelle.

## Ce qu'il faut (depuis le poste de Claude Code)

1. **Préalables** : 026-058, 026-143, 026-148, 026-170, 026-194 et **026-196** en PASS (tout ce qui installe en root est fait).
   Le retrait a peut-être déjà eu lieu à la main (préalable de 026-179, `prealable.md`) : `durcir.sh` est idempotent.
2. **« Oui » de Benj, daté** (à noter dans `durcissement.md`) : au compte `gardien` et au retrait du sudo sans mot de passe et du
   groupe `docker` de `usine`. Aucun retrait avant.
3. **Clé du gardien** : `~/.ssh/presti-usine-gardien` existe déjà (préalable de 026-179) ; ne pas la recréer. Sa clé publique :
   `~/.ssh/presti-usine-gardien.pub`. Jamais de clé privée dans un fichier de preuve.

## Commandes, dans l'ordre

```
node scripts/usine.mjs etat                                            # vert ; sinon stop
# « avant », à coller dans durcissement.md (section « Avant ») :
ssh -i ~/.ssh/presti-usine usine@<hôte> "systemctl list-units 'presti-*' --all --no-legend; ss -ltn"
ssh -i ~/.ssh/presti-usine usine@<hôte> "sudo -n iptables -S INPUT"    # sous gardien si usine n'a déjà plus le sudo
#   + section « Écoutes attendues » : sshd 22 ; freellmapi 127.0.0.1:3001 ; résolveur 127.0.0.53:53 ;
#     Claw3D 127.0.0.1:3000 et [::1]:3000 si gardé ; rpcbind 111 tant qu'il n'est pas coupé
# 1) VÉRIFIER LE GARDIEN AVANT TOUT RETRAIT (clé du poste seulement) :
ssh -i ~/.ssh/presti-usine-gardien -o BatchMode=yes gardien@<hôte> 'sudo -n true && id -nG'   # attendu : code 0, groupe sudo
# 2) durcir, sous gardien :
ssh -i ~/.ssh/presti-usine-gardien gardien@<hôte> 'bash -s -- "'"$(cat ~/.ssh/presti-usine-gardien.pub)"'"' < scripts/usine/durcir.sh
# 3) second passage (idempotence) : même commande
# 4) juge :
node scripts/usine-durcie-qa.mjs --reel 2>&1 | tee .orchestre/preuves/026-197/verifier.log
```

Si le gardien n'existe pas encore : lancer `durcir.sh` une fois sous `usine` (tant qu'il a son sudo) pose le gardien et s'arrête
code 5 sans rien retirer ; puis la vérification 1) ; puis le lancement 2) sous gardien.

## Sorties attendues

- Étape 1 : code 0 (`sudo -n true` réussit sous `gardien`).
- Étape 2, premier passage : `+ …` pour chaque changement (ligne usine retirée de `90-cloud-init-users`, usine retiré de `sudo` et
  `docker`, `rpcbind` désactivé si aucun NFS), fin `✓ durci : N changement(s)` ; code 0.
- Étape 3 : `✓ déjà durci : rien à changer` ; code 0.
- Sous `usine` ensuite : `sudo -n true` refusé, `id -nG` sans `sudo` ni `docker`, `docker ps` refusé, freellmapi répond encore.
- UD-R vert : unités `presti-*` et `iptables -S INPUT` identiques à la section « Avant », `ss -ltn` dans la liste attendue,
  `usine.mjs etat`, `usine-socle-qa --reel`, `chef-qa --reel` verts.
- À constater et noter : cloud-init ne repose pas la règle au redémarrage (sinon `/etc/cloud/cloud.cfg.d/99-presti.cfg`).

## À livrer ensuite

`durcissement.md` (liste des unités et `iptables -S INPUT` avant/après, « oui » de Benj et sa date, chaque commande lancée, sortie
de `durcir.sh`), `verifier.log` du `--reel`, `presti-ops/usine/LISEZMOI.md` (hors dépôt), accord de Benj sur le diff de
`scripts/usine.mjs` avant le push. Tant que ce n'est pas fait, la fiche 026-197 n'est PAS terminée.
