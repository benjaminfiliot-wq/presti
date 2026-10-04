# 026-226 — état de la mise en service (04/10)

Livré et jugé : `scripts/chef/douleurs.mjs`, `docs/agents/douleurs-mensuelles.md`, `scripts/usine/systemd/presti-douleurs.service`
et `.timer`. Verdict final : PASS 11/11 (DO-0 à DO-9 et DO-R), jugé sur l'usine, hors réseau, horloge figée. Les dépendances
026-220, 026-103 et 026-121 sont en `fait/`. Contre-vérification : quatre sabotages réversibles, sha256 restauré
(`contre-verif-29-09.md`).

## État honnête

- **Minuteur : INACTIF.** Rien ne tourne sur l'usine tant que les gestes ci-dessous ne sont pas faits. Aucun envoi, aucune dépense,
  aucun appel externe n'a eu lieu.
- **Collecteur de sources : absent.** Sans `sources-AAAA-MM.json`, la passe rend « rien de mesuré » (vrai : rien n'est mesuré).

## Gestes restants (réservés : « oui » de Benj au minuteur, puis Claude Code avec le compte `gardien`)

1. Ajouter `PRESTI_JETON_DOULEURS` à `NOMS_PERMIS` de `scripts/usine/coffre-regles.mjs` (hors périmètre de 026-226 : fiche ou
   geste de mise en service à part).
2. Poser le jeton de l'agent `douleurs` (semé par 0113) dans le coffre de l'usine sans l'afficher (voie de 026-050).
3. Copier les deux unités dans `/etc/systemd/system/`, `systemd-analyze verify`, puis `systemctl enable --now presti-douleurs.timer`.
4. Noter le résultat dans cette preuve, sans jeton.
