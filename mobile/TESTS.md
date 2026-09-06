# Parcours de test de l'application (prompt v9 §5.3)

Sur de **vrais appareils** — un Android, un iPhone, et un troisième téléphone pour jouer le client. Chaque ligne se coche avec la date et l'appareil. Rien n'est soumis aux stores tant que la colonne n'est pas pleine.

| # | Étape | Attendu | Android (date · appareil) | iPhone (date · appareil) |
|---|---|---|---|---|
| 1 | Installation (APK signé 0.1.2 — avec Firebase : Paramètres → Application → « Télécharger (APK) » / TestFlight) | l'icône Presti sur l'écran d'accueil | 07/09 · APK v4 (debug) installé par Benj — **à remplacer par l’APK 0.1.1** (signature différente : désinstaller v4 d’abord) | |
| 2 | Ouverture | écran de lancement nuit → page de connexion, sans flash blanc | | |
| 3 | Connexion : mot de passe puis code par email | pavé numérique, code accepté, tableau de bord | | |
| 4 | Paramètres → Notifications → « Activer sur cet appareil » | l'appareil apparaît dans la liste | | |
| 5 | « M'envoyer un test » | la notification arrive dans la seconde, avec l'icône Presti | 07/09 · Firebase posé (M3) : à jouer avec l’APK 0.1.2 | |
| 6 | Verrou biométrique (Face ID / empreinte) au retour après 5 min d'arrière-plan | demandé ; refus → mot de passe + code | | |
| 7 | Une vraie conversation depuis l'autre téléphone (plateforme de l'artisan) | la push « Nouvelle demande » arrive | | |
| 8 | Toucher la notification | l'app s'ouvre **sur la conversation** | | |
| 9 | Prise de main, réponse | le client la reçoit | | |
| 10 | Devis depuis la conversation | créé, envoyé | | |
| 11 | Partage du PDF du devis | feuille de partage native (WhatsApp, Mail…) | | |
| 12 | Photo de chantier (fiche client / inventaire) | caméra native, photo enregistrée | | |
| 13 | Scan d'un code-barres (inventaire) | lecture immédiate, article trouvé ou créé | | |
| 14 | Arrière-plan 10 min → retour | verrou biométrique, puis boîte de réception rafraîchie | | |
| 15 | Réseau coupé | bandeau « hors ligne », page de secours si l'app est relancée | | |
| 16 | Lien reçu par email (« un client vous a écrit ») | ouvre l'app si elle est installée, la conversation directement | | |
| 17 | Déconnexion | l'appareil disparaît de Paramètres → Notifications, plus aucune push | | |

Notes de passage :

- 
