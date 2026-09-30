# 026-092 — blocage du harnais de réunion, 30/09

La lecture a passé SV-1 à SV-22, dont le serveur vivant et les comptes synthétiques nettoyés. La réunion a passé RA-1 à RA-5 avec doublures et la fermeture 404 sur le serveur réel. TypeScript est vert. Le verdict officiel complet reste FAIL RA-4 ; la fiche n'est ni validée ni poussée.

`scripts/station-route-qa.mjs`, vers les lignes 840–841 et 890, cherche exactement une occurrence de `busAgents: false,` avant de lever ce drapeau dans sa copie. `lib/flags.ts` dans HEAD porte déjà `busAgents: true,`. Le harnais échoue avant de démarrer sa copie. Il ne s'agit pas d'un défaut démontré des routes ; cela ne constitue pas non plus une preuve vivante complète de la réunion.

Correction à faire par Claude cloud, propriétaire des juges : accepter dans la copie une déclaration unique busAgents false ou true, lever seulement la copie, conserver l'empreinte du fichier réel et tous les contrôles d'authentification et de drapeaux. Ne pas baisser le drapeau réel ni supprimer RA-4.

Le démarrage Turbopack du serveur réel plante ; la réutilisation documentée de PRESTI_BASE_URL avec un serveur local Webpack a permis les mêmes assertions vivantes. Le serveur local 3492 a été arrêté. Aucun juge, drapeau, migration ou autre fichier hors périmètre 026-092 n'a été modifié.

Après arrivée de la correction : relancer le vérificateur officiel, déplacer en fait seulement sur PASS, puis relancer depuis fait. Les cinq fichiers de la fiche sont gelés et restent non committés.

## Contre-vérification ciblée des sous-parties d'argent

Deux valeurs brutes échappaient au tri des enveloppes : le palier du Commandement, calculé à partir du niveau lié aux recettes, et le coût journalier des IA dans la salle des machines. `DOMAINE_DE` classe maintenant `direct.carte.paliers.commandement` et `salle.machines.ia.cout_jour_eur` sous `comptabilite`. Le tri évalue le domaine avant de reconnaître une enveloppe et descend dans les objets bruts. Un refus rend `HORS`, jamais un zéro inventé ; les tableaux restent des tableaux et les dates ISO restent des chaînes.

Test isolé, sans appel externe : `node --import ./scripts/ts-loader.mjs .orchestre/travail/relais-0930/092-garde-paliers.mjs`, code 0.

```text
PASS : palier financier brut refusé, paliers sans argent préservés, autorisation intacte, entrée immuable.
PASS : coût journalier brut refusé, fournisseurs et bascules préservés, tableaux et dates ISO intactes, entrée immuable.
```

`npm run typecheck` : code 0 après ces corrections. Cette épreuve ciblée ne remplace pas le verdict officiel ni le harnais vivant RA-4 ; aucune extension de rôles, aucun drapeau ni juge modifié.
