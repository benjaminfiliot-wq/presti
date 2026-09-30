# Le faux système de fichiers de usine-durcie-qa (026-194)

Une copie d'essai de ce que `scripts/usine/durcir.sh` lit et écrit (`--racine-systeme=<dossier>`) : `etc/sudoers.d/`, `etc/group`,
`etc/passwd`. L'état d'AVANT le durcissement de l'usine (24/09/2026) : `usine` a `NOPASSWD:ALL` dans `90-cloud-init-users`, est
dans les groupes `sudo` et `docker`, et le compte `gardien` n'existe pas. Aucune vraie donnée. Le juge en fait une copie par cas
et ne modifie jamais ces fichiers.
