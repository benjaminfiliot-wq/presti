# OneDrive — fiche connecteur
Source : Microsoft Graph, « List children of a driveItem » (learn.microsoft.com/en-us/graph/api/driveitem-list-children?view=graph-rest-1.0, lue le 03/11/2026) · nœud n8n : Microsoft OneDrive (type exact à vérifier)
Ce que le système en fait : Drive / OneDrive, ligne « Google Drive / OneDrive » (OUTILLAGE.md § 0.4) : un dossier par client et par chantier (photos, devis et factures en PDF, PV, attestations)
Portées demandées (le minimum) : lecture : `Files.Read` (délégué, compte professionnel ou personnel) ; écriture plus tard, après la porte : `Files.ReadWrite` (les portées `.All` ne sont pas demandées : moins que le minimum)
Ce qu'on lit : liste des dossiers et fichiers d'un dossier de chantier (`GET /me/drive/items/{item-id}/children`) ; pagination par `@odata.nextLink` (200 éléments par défaut)
Ce qu'on écrit (après la porte) : dépôt d'un PDF de devis ou facture dans le dossier du client, après validation
Où vit l'autorisation : jamais dans un fichier ni dans n8n en clair ; voie O3 (a) ou (b), à trancher par Benj
Comment le client la retire : depuis son compte Microsoft (applications consenties) — à vérifier
Ce qui se passe quand elle expire : le système se tait, « Connexions » le dit, une alerte part
Quotas de l'API : non lus (la page ne donne pas de chiffre dans la partie lue) — à vérifier
Coût : gratuit pour l'API Graph ; espace de stockage à la charge du client (licence Microsoft 365 ou OneDrive personnel) — à vérifier
Entrée sans webhook : déclencheur horaire suivi du nœud de liste des dossiers, ou déclencheur natif du nœud OneDrive si disponible
Test hors ligne qui le prouvera : liste d'un dossier d'essai en `Files.Read`, vérification qu'aucun fichier n'est écrit en simulation (à écrire)
Points à vérifier par Claude Code : le consentement admin pour le compte professionnel (non lu) ; la règle de nommage des dossiers par client (ne pas exposer de nom de personne dans les logs)
