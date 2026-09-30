### canal-instagram-retire -> code 1 ; attendu CR-11 ; vu : CR-13 
### index-sans-exception-externe -> code 1 ; attendu CR-11 ; vu : CR-11 CR-13 
### table-ouverte-a-anon -> code 1 ; attendu CR-11 ; vu : CR-11 CR-13 
### appel-executable-par-service-role -> code 1 ; attendu CR-12 ; vu : CR-12 CR-13 
### delai-de-2-s -> code 1 ; attendu CR-12 ; vu : CR-12 CR-13 
### cron-toutes-les-heures -> code 1 ; attendu CR-12 ; vu : CR-12 CR-13 
### secret-hors-vault -> code 1 ; attendu CR-12 ; vu : CR-12 CR-13 
### horaire-non-exige -> code 1 ; attendu aucun (la contrainte n'est lue que par l'essai) ; vu : CR-13 
restauration exacte : sha256 identique (b8b3cb3011440cb230024b699c451a3950cb0867af87cee213674cebadba2525)
crieur-qa : PASS

Lecture (CR-13 échoue partout parce que le jumeau n'est pas resynchronisé avec le sabotage : ce n'est PAS le critère visé) :
- 6 sabotages sur 8 sont tués par LEUR critère (CR-11 ou CR-12).
- Limites du juge `crieur-qa --partie=horloge`, hors périmètre de 026-134 (à signaler à son auteur) : « canal-instagram-retire » n'est vu que par l'écart jumeau/migration (CR-13) : CR-11 vérifie qu'une contrainte `canal in (` existe, pas que `instagram` y figure ; « horaire-non-exige » (check (statut <> 'programmee' or programmee_pour is not null) remplacé par check (true)) n'est vu que par CR-13 : CR-11 ne lit pas cette contrainte. Les deux sont tués par l'essai à sec de la production (instagram_accepte : le cas « programmee sans horaire » et « canal inconnu » y sont exercés) tant que le jumeau est régénéré depuis la migration sabotée.
