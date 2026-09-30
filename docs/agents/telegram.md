# Le pont Telegram

Le pont est le transport de tes commandes et de tes alertes entre ton téléphone et l'écosystème, quand le PC est éteint. Il tourne sur l'usine, dans le service `presti-telegram`, et parle à Presti par deux routes protégées (`/api/agents/telegram/sortie` et `/api/agents/telegram/entree`). Il n'ouvre aucun port : il interroge Telegram (long polling), rien ne l'atteint de l'extérieur.

## Les trois commandes

La liste est fermée. Tout autre texte reçoit l'aide.

- `/etat` : l'état en une ligne (pause générale, nombre de points rouges, orange, appels à rendre, agents en panne).
- `/pause <motif>` : pose la pause générale. Plus rien ne sort. Le motif est masqué avant d'être gardé.
- `/chef <texte>` : une consigne de 3 à 200 signes pour le Chef. Elle compte dans le même quota de 20 par jour que la station.

Au plus 20 commandes par heure ; au-delà, le pont répond « trop de commandes ».

**Le pont ne lève jamais la pause : la reprise se fait à la station.** Il n'existe aucune commande de reprise, ni cachée ni d'un autre nom.

## Ce qui arrive sur ton téléphone

- Les alertes qui méritent un geste : paiement, appel à rendre, agent en panne, argent bloqué, coupe-circuit, point du jour, usine injoignable, canal arrêté, Gmail bloqué. Le texte est le titre et la ligne de l'alerte, rien d'autre.
- Les comptes rendus du Chef (consigne lue, cycle terminé, compte rendu de réunion), masqués.

**Aucune donnée de prospect ne part vers Telegram** : ni nom, ni numéro, ni adresse, ni montant, ni le détail d'une alerte.

## Tes gestes

1. Créer le bot : dans Telegram, écrire à BotFather, `/newbot`, choisir un nom. BotFather donne un jeton.
2. Déposer le jeton dans ton propre terminal, jamais dans une conversation : Claude Code te donne la commande à lancer, le jeton se range dans le coffre de l'usine sans s'afficher.
3. Envoyer `/start <code>` au bot, avec le code à 8 signes que Claude Code te donne dans la conversation. Il n'est valable que 10 minutes après le démarrage du service et une seule fois ; le service répond « appairé : Claude Code termine ». Un message d'un inconnu, un mauvais code ou un code tardif ne reçoit aucune réponse.

## Couper le pont

`systemctl stop presti-telegram` sur l'usine, par Claude Code, sur ton ordre. La pause générale coupe aussi les envois qui partent d'ailleurs ; elle ne remplace pas l'arrêt du service.

## Ce que le service ne fait pas

- Il ne garde aucune valeur de jeton dans un fichier, un journal ou une ligne de commande : les quatre valeurs (`TELEGRAM_BOT_TOKEN`, `PRESTI_JETON_TELEGRAM`, `TELEGRAM_CHAT_ID`, `TELEGRAM_CODE_APPAIRAGE`) viennent du coffre au démarrage.
- Il ne répond à aucune autre conversation que la tienne.
- Un seul processus tient le pont à la fois (verrou sur son fichier d'état) : un message n'est jamais traité deux fois.
- OpenClaw, s'il est installé, reste dans son conteneur et n'a ni ces quatre valeurs ni le jeton du pont.
