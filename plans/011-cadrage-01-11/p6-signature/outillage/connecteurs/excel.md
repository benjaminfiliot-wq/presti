# Excel — fiche connecteur
Source : Microsoft Graph v1.0, « Working with Excel in Microsoft Graph » (learn.microsoft.com/en-us/graph/api/resources/excel, lue par extrait de recherche le 03/11/2026 ; page complète non ouverte) · nœud n8n : Microsoft Excel 365 (type exact à vérifier dans docs.n8n.io/integrations)
Ce que le système en fait : Excel, ligne « Excel 2.2 (outil) » (OUTILLAGE.md § 0.4, § 6) : tarifs lus dans un classeur (Rédacteur de lignes, devis), import de l'export comptable (Facturation), import Sheets ou Excel par le circuit contrôlé (Opérations)
Portées demandées (le minimum) : lecture d'abord : `Files.Read` (délégué, lecture des fichiers de l'utilisateur) ; écriture plus tard, après la porte : `Files.ReadWrite` (lecture et écriture). Pas de portée propre à Excel : l'API Excel passe par la portée des fichiers
Ce qu'on lit : feuilles, plages et tableaux d'un classeur `.xlsx` (tarifs, export) par `/workbook/worksheets` et `/range`
Ce qu'on écrit (après la porte) : valeurs de plage ou de tableau, seulement sur le circuit contrôlé (import validé) ; jamais une cellule de montant écrite sans le code (règle : montants par le code)
Où vit l'autorisation : jamais dans un fichier ni dans n8n en clair ; voie O3 (a) ou (b), à trancher par Benj (OUTILLAGE.md § 4)
Comment le client la retire : depuis son compte Microsoft (« Applications » du compte, consentements) ou depuis l'écran « Connexions » de Presti — à vérifier que ce second chemin existe
Ce qui se passe quand elle expire : le système se tait, « Connexions » le dit, une alerte part
Quotas de l'API : non lus (les limites Graph par application et par utilisateur ne sont pas dans l'extrait) — à vérifier
Coût : l'API est incluse dans une licence Microsoft 365 du client ; le classeur n'est lisible que s'il est sur OneDrive Entreprise ou SharePoint — à vérifier le prix de la licence
Entrée sans webhook (n8n n'est pas exposé) : déclencheur horaire suivi d'une lecture du classeur ; ou lecture à la demande par Presti
Test hors ligne qui le prouvera : lecture d'un classeur d'essai avec `Files.Read` ; vérification qu'aucune écriture ne part sans la porte (à écrire)
Points à vérifier par Claude Code : le comportement sur OneDrive grand public (la page dit que l'API Excel n'y est pas prise en charge : un artisan qui n'a qu'un OneDrive perso ne peut pas utiliser ce connecteur) ; le format `.xls` refusé (seul `.xlsx`) ; le mode de session (persistante ou non) à choisir pour les écritures ; les quotas réels
