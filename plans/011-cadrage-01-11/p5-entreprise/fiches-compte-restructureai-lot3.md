# Fiches de lecture : vidéos 48 à 66 de @restructureai (lot 3 sur 3, tâche 035-009)

> Écrit le 03/11/2026 par Hermes, sur l'hôte d'agents Oracle. Entrées : /home/usine/agents/videos/references-2026-11-02/restructureai/ (transcriptions Whisper, info.json, planches d'images une par seconde). Rien n'a été téléchargé.
> Conventions : [mm:ss] = début du segment Whisper ; « image NNN » = la vignette NNN de la planche (environ une par seconde).
> Vidéos sans parole (transcription vide ou un seul mot) : 48, 52, 56, 63 ; elles sont décrites par leurs images seulement.
> Un chiffre de l'auteur est suivi de « annoncé par l'auteur, non vérifié ». Un chiffre lu sur une maquette est suivi de « lu sur une maquette, non vérifié ».
> Les noms de personnes, de clients et les coordonnées ne sont pas recopiés. Les citations sont reformulées en français.

---

## 48. « AI Social Media Operating System » (27/08/2026)

Source : « AI Social Media Operating System », @restructureai, https://www.tiktok.com/@restructureai/video/7678542032863759624 · publiée le 27/08/2026 · lue le 03/11/2026 · intégralement : oui (images, sans parole)
Ce qu'elle montre :
- Images 001 à 003 : le titre « AI Social Media Operating System », puis un pipeline de blocs.
- Images 003 à 011 : les blocs s'allument dans l'ordre : Research, Content Engine, Production Studio, Distribution (quatre réseaux affichés), Engagement, Analytics, Monetization.
- Un compteur de modules actifs en bas (« 6/7 », puis « 7/7 ») : lu sur une maquette, non vérifié.
- Images 009 et 010 : l'étape Analytics passe à l'état « Learning » ; image 011 : la monétisation passe à « Converting ».
- Image 012 : bandeau « Growth Engine – Live ».
- Aucune parole : seule la mise en page dit quelque chose.
- Planche, images 003 à 012 : chaque bloc porte une pastille d'état qui change au fil des images (Decoded, Scripted, Rendered, Live, Captured, Logged, Booked) et des logos : « ElevenLabs » est lu sur le bloc Voiceover, « make » sur Engagement et Monétisation ; Distribution montre les logos de quatre réseaux sociaux avec la mention « auto-publish ».
- Planche, images 011 et 012 : sous Monétisation, la phrase « personne ne touche au tunnel, les leads deviennent des appels réservés » (reformulée) ; image 012 : revenu « +1 240 dollars » et compteur à « 7/7 », lus sur une maquette.
Principes et patterns réutilisables :
- Un pipeline à blocs qui s'allument étape par étape, plutôt qu'une liste de tâches (images 003 à 011).
- Un compteur de modules actifs : on voit où le système s'arrête (images 001 à 012).
- L'analyse porte une étape d'apprentissage avant la suivante (images 009 à 010).
Erreurs à éviter :
- Dit par l'auteur : rien. La vidéo n'a pas de voix.
- Constaté : les écrans sont des maquettes sans journal d'exécution ni résultat réel.
- Constaté : la monétisation n'affiche qu'un revenu chiffré (image 012), sans pièce ni source.
Ce qui s'applique à Presti / à ce client :
- Le pipeline de blocs qui s'allument (images 003 à 012) donne la forme d'un suivi de flux dans l'assistant de gestion : chaque étape montre où le travail s'arrête, comme l'accueil « Aujourd'hui » (L5, 032-041) et son journal (`assistant_journal`, 0185). Chez un client Entreprise, `lib-journaliser` alimente la même vue avec une trace réelle, ce que la maquette n'a pas.
- Le compteur « modules actifs » (images 001 à 012) suggère un indicateur de mise en route pour l'Entreprise : ce qui tourne et ce qui est encore en mode à blanc, par phase (§7.2 de `premiere-reponse.md`). Idée nouvelle : à proposer à Benj, dans n8n.
- L'étape « Learning » (images 009 et 010), où les contenus gagnants nourrissent la recherche, rejoint le chantier 5 : mesurer les contenus de Presti en demandes reçues (`leads.origine`, `0177_canaux_reseaux.sql`), jamais en vues.
- La publication automatique sur quatre réseaux (images 007 à 012) n'est reprise que pour les contenus de Presti lui-même, après les 2 ou 3 premiers validés par Benj, puis sous contrôle qualité (`autonomie-abonnements.md`) ; les comptes réseaux non Presti restent intouchables (`securite.md`).
- « Aucun humain ne touche le tunnel » (image 012) est refusé : Studio prépare et l'artisan valide (`lib/plans.ts:11`), et même en Signature jamais un prix estimé ni un paiement sans lui. Le revenu affiché n'a aucune pièce : un chiffre sans source est refusé (`lib-rapport-hebdo`).
Ce qui ne s'applique pas, et pourquoi :
- La distribution sur quatre réseaux est une activité de marque personnelle : Presti ne la gère pas pour ses artisans.
- La monétisation et le « Growth Engine » sont une maquette, sans client réel.
- Aucun outil n'est décrit : seuls deux noms de marques sont lisibles à l'écran (ElevenLabs, Make).
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- Compteur de « 0/7 » à « 7/7 » de modules actifs (images 001 à 012) : lu sur une maquette, non vérifié.
- Revenu « +1 240 dollars » (image 012) : lu sur une maquette, non vérifié.
- Aucun autre chiffre n'est donné (annoncé par l'auteur, non vérifié : sans objet).

---

## 49. « I Built 55 AI Agents to Run an Automotive Company » (26/08/2026)

Source : « I Built 55 AI Agents to Run an Automotive Company », @restructureai, https://www.tiktok.com/@restructureai/video/7678196502811954439 · publiée le 26/08/2026 · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:10] L'auteur présente une équipe de 55 agents IA (annoncé par l'auteur, non vérifié) : six départements, 18 modules, un propriétaire.
- [00:10]-[00:24] Trois exemples : une demande de revendeur approuvée avant le lundi, des prix recalculés quand un fournisseur change le sien, un stock suivi en temps réel.
- [00:29]-[00:44] Premier module, du devis à l'exécution : il lit le dossier du revendeur et la compatibilité, construit le devis, et ne propose pas un prix hors du palier du revendeur.
- [00:47]-[01:03] Module achats et import : suivi du conteneur, coût d'achat recalculé dès qu'un cours ou un prix bouge, brouillon de commande avant la rupture.
- [01:03]-[01:14] Module d'intégration et d'approbation : une demande de revendeur est préparée le lundi ; « une décision, pas une file d'attente ».
- [01:15]-[01:27] Un orchestrateur contrôle chaque commande (prix, stock), arrête et prévient le propriétaire en cas de doute ; il ne fait pas le travail, il décide qui le fait.
- Planche, images 023 à 034 : un panneau « Infrastructure & Runtime » liste les outils sous-jacents (Supabase, un hébergeur, n8n, un ordonnanceur, une file, un gestionnaire de secrets) au-dessus d'un « plan de contrôle » avec un tableau de bord du propriétaire et un « Kill switch » (image 023) ; une carte « Quote · Order · Fulfill » nomme ses outils (image 034).
- Planche, images 078 à 089 : le bloc « Orchestrator » enchaîne écouter, enrichir, chiffrer, confirmer le stock, expédier, escalader, avec la mention que seuls les cas limites atteignent le propriétaire (image 078) ; dessous, une colonne « Waiting on you » où chaque décision (prix, crédit, garantie, remboursement) a des boutons Hold et Approve (image 089).
Principes et patterns réutilisables :
- Un orchestrateur qui route sans exécuter, et s'arrête sur les cas hors norme [01:15]-[01:27].
- Le propriétaire garde les décisions qui engagent : palier de prix, limite de crédit, garantie, remboursement [01:29]-[01:36].
- Un refus par construction : un prix absent du palier n'est jamais proposé [00:38]-[00:44].
Erreurs à éviter :
- Dit par l'auteur : une demande reçue à deux heures du matin est approuvée avant le lundi [00:10] ; le système répond même hors des heures, sans preuve.
- Dit par l'auteur : « une décision, pas une file d'attente » [01:14] ; la phrase n'explique pas la logique.
- Constaté : la vidéo ne dit ni comment les 18 modules échangent des données, ni ce qui se passe si une étape échoue.
Ce qui s'applique à Presti / à ce client :
- « Les cas standard se règlent de bout en bout, seuls les cas limites atteignent le propriétaire » (image 078) et l'orchestrateur qui route sans exécuter [01:15]-[01:27] : c'est `ent-exemple-parent` (035-007), un workflow parent qui route sans modèle (§4.2 de `premiere-reponse.md`) ; la maquette le fait « raisonner » avec un modèle, Presti non. En Studio, tout passe par le clic (`lib/plans.ts:11`).
- Les boutons Hold et Approve par décision (image 089) sont les cartes de « À valider, l'argent d'abord » (L5) : une carte, un geste ; pour l'Entreprise, le gérant ou un membre habilité (rang 0). Prix, plafond de crédit et remboursement restent calculés par le code et décidés par un humain ; Presti n'a aucun accès bancaire.
- « Un prix hors du palier n'est jamais proposé » [00:38]-[00:44] : refus par construction, même logique que l'anti-fabrication de Presti (jamais un prix sourcé inventé, `lib/ai.ts`) ; pour l'Entreprise, `lib-porte-conformite` (veto) joue ce rôle avant `lib-executer`.
- Le « Kill switch » (image 023) correspond à `lib-disjoncteur` et à « Tout arrêter » du pilote : un seul geste coupe tout. La pile montrée (Supabase, n8n) est celle de Presti (`architecture-outils.md`) ; la vidéo n'en dit pas plus que le schéma.
- La demande reçue à deux heures du matin et approuvée avant lundi [00:10] est une promesse sans preuve ; chez Presti la réponse est préparée en moins d'une minute (`lib/ai.ts`) et part au clic (Studio) ou seule (Signature). Le suivi de conteneur et les achats importés n'ont pas d'équivalent pour un artisan.
Ce qui ne s'applique pas, et pourquoi :
- Le secteur (distribution automobile, pièces, stocks) n'est pas celui des artisans de Presti.
- Les modules d'achats et d'import ne concernent pas une entreprise de services.
- Aucun outil précis n'est nommé dans l'audio.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 55 agents » [00:00] : annoncé par l'auteur, non vérifié.
- « six départements » et « 18 modules » [00:05] : annoncé par l'auteur, non vérifié.
- « deux heures du matin » [00:10] : exemple narratif, annoncé par l'auteur, non vérifié.

---

## 50. « How a Local Business Runs Marketing With AI Agents » (25/08/2026)

Source : « How a Local Business Runs Marketing With AI Agents », @restructureai, https://www.tiktok.com/@restructureai/video/7677816220770389269 · publiée le 25/08/2026 · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:05] L'auteur dit avoir remplacé l'équipe marketing d'une entreprise locale par un système d'agents IA, et annonce des économies de salaires et de contrats d'agence.
- [00:09]-[00:14] Critique des assemblages d'une dizaine d'outils qui cassent au premier changement ; le système annoncé compte 14 modules, chacun avec une entrée, un travail et une sortie.
- [00:19]-[00:30] Premier module, la fabrique de contenu : elle lit le brief, la voix de la marque, les allégations permises, puis écrit la semaine (scripts, posts, e-mails, pages).
- [00:38]-[00:48] Module de demande payante : il mise sur la semaine, coupe les campagnes perdantes chaque vendredi, rafraîchit les créatifs avant que le coût ne monte.
- [00:52]-[01:04] Module de réponse rapide : un formulaire reçu un dimanche soir reçoit une réponse en moins d'une minute, qualifie et prend rendez-vous.
- [01:04]-[01:14] Un directeur marketing route les tâches et s'arrête aux portes de validation ; il ne fait pas le travail lui-même.
- Planche, images 021 à 031 : un « Publishing engine » (file approuvée, règles de canal, planificateur) porte la mention « HUMAN GATE : rien ne publie sans approbation pendant les 90 premiers jours » (image 021) ; le tableau « This week's output » (scripts, posts, e-mail, page de service) affiche des statuts Published, Waiting on you et Approved, avec un contrôle de marque qui retient une page sur une question de garantie (image 031).
- Planche, images 061 et 071 : un « Speed-to-lead responder » reçoit formulaires, messages, appels manqués, chat et prospects publicitaires, répond par SMS puis lit un « vrai calendrier » (image 061) ; l'écran « Marketing Director » affiche des économies mensuelles chiffrées, un temps passé et un nombre de modules (image 071) : lu sur une maquette, non vérifié.
Principes et patterns réutilisables :
- Une règle de contenu écrite en amont : rien n'est affirmé s'il n'est pas dans la base de marque [00:35].
- Un contrôle hebdomadaire à date fixe : couper les campagnes perdantes [00:43].
- Un directeur qui route et s'arrête aux portes de validation [01:04]-[01:09].
Erreurs à éviter :
- Dit par l'auteur : « 25 minutes par semaine » [01:22], sans dire qui les passe ni pour quel résultat.
- Dit par l'auteur : trois salaires et deux contrats d'agence remplacés [00:05] ; aucun montant n'est donné.
- Constaté : le texte annonce des économies, sans chiffre sourcé ni avant-après.
Ce qui s'applique à Presti / à ce client :
- Réponse en moins d'une minute à une demande de dimanche soir [00:52]-[01:04] : c'est le cœur de Presti (`lib/ai.ts`). Mais la maquette (image 061) montre l'IA qui propose une heure, la réserve et promet qu'un membre de l'équipe apporte une bâche : Presti ne reprend ni le rendez-vous pris seul, ni le créneau, ni le délai inventés. Une urgence (fuite d'eau) est escaladée à l'artisan (`lib/pilote/regles.ts:191`).
- « HUMAN GATE : rien ne publie sans approbation » (image 021) et le contrôle de marque qui retient une page (image 031) : ce sont les 2 ou 3 premiers contenus validés par Benj, puis la QA automatique qui peut les repasser en validation (`autonomie-abonnements.md`). La « base de marque » écrite d'avance [00:35] est le ton de l'artisan, prouvé par `scripts/persona-e2e.mjs`.
- La cadence lundi, mercredi, vendredi (image 051) et « couper les campagnes perdantes » [00:43] relèvent de la publicité payante : hors Presti sans accord de Benj (`securite.md`). Le contrôle à date fixe reste une bonne idée pour le résumé du matin (`presti-briefing-matin`, L15).
- L'écran « Marketing Director » et ses économies chiffrées (image 071) sont refusés tels quels : un chiffre d'économie sans source n'entre dans aucun rapport (`lib-rapport-hebdo`). Sa colonne « Waiting on you » est la carte « À valider » (L5) ; le directeur qui route et s'arrête aux portes [01:04]-[01:09] est `ent-exemple-parent`.
Ce qui ne s'applique pas, et pourquoi :
- La marque, le client et le secteur ne sont pas nommés : impossible de vérifier le cas.
- La réponse en moins d'une minute dépend d'outils qui ne sont pas décrits.
- Le modèle « fabrique de contenu + demande payante » suppose une publicité au quotidien, que Presti ne gère pas.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 14 modules » [00:14] : annoncé par l'auteur, non vérifié.
- « trois salaires » et « deux contrats d'agence » [00:05] : annoncé par l'auteur, non vérifié.
- « 25 minutes par semaine » [01:22] : annoncé par l'auteur, non vérifié.
- « 90 premiers jours » de validation humaine avant publication (image 021) et économies mensuelles chiffrées de l'écran « Marketing Director » (image 071) : lus sur une maquette, non vérifié.

---

## 51. « I Built a one person Company With 0 Employees » (22/08/2026)

Source : « I Built a one person Company With 0 Employees », @restructureai, https://www.tiktok.com/@restructureai/video/7676676756232834311 · publiée le 22/08/2026 · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:10] L'auteur présente un système d'exploitation IA pour une entreprise sans salarié (40 agents, annoncé par l'auteur, non vérifié) qui fait tourner une entreprise de services locaux.
- [00:28]-[00:43] Marketing et vente : un agent vocal décroche le téléphone ; texte, messages et chat lisent le même agenda, qualifient, prennent rendez-vous, construisent le devis, puis s'arrêtent avant la conclusion.
- [00:48]-[01:08] Opérations : la signature crée le chantier, la liste de matériel se fait seule, un sous-traitant absent est remplacé, la facture part à la clôture.
- [01:08]-[01:18] Finance : un encaissement, une relance après 30 jours de retard, et une correction des prix selon le coût réel.
- [01:23]-[01:33] Une couche par-dessus : Claude Code, branché en MCP sur le CRM, les chantiers et la comptabilité ; les règles et tarifs sont des fichiers simples.
- Planche, images 013 et 025 : un bloc « Books & tax » (saisie des reçus, catégorisation, validation du comptable) et un bloc « Spend approval » dont le message « vous me devez » est rédigé avant qu'on ait envie de l'écrire (image 013) ; un bloc « Retention & Referral » : demande d'avis, avis Google, mauvais avis renvoyé au dirigeant, plan d'entretien, garantie, parrainage, avant/après et étude de cas (image 025).
- Planche, images 049 à 097 : un devis d'exemple et un trait hachuré « l'automatisation s'arrête ici » avant la signature (image 049) ; un banc de techniciens où l'un est remplacé et le client reçoit un message (image 061) ; un graphique « chiffré contre réel » par ligne (matériaux, main-d'œuvre, frais généraux) pour fixer le prochain devis (image 085) ; « One Layer » : Claude Code et MCP posés sur des fichiers simples (image 097).
Principes et patterns réutilisables :
- Une seule source de vérité pour l'agenda, lue par tous les canaux [00:34]-[00:38].
- Le système s'arrête avant l'engagement commercial ou financier : la conclusion reste à l'humain [00:43]-[00:48].
- Les règles (tarifs, pièces, sous-traitants) sont des fichiers lisibles, pas du code caché [01:33].
Erreurs à éviter :
- Dit par l'auteur : « l'IA déplace l'information, vous déplacez l'argent et le risque » [01:33]-[01:39] ; formule de vente, sans démonstration.
- Dit par l'auteur : « la finance n'est plus un service, c'est ce qui se passe quand un chantier finit » [01:08] ; affirmation, pas une preuve.
- Constaté : aucun chantier réel n'est montré ; les étapes sont décrites, pas démontrées.
Ce qui s'applique à Presti / à ce client :
- « L'automatisation s'arrête ici » avant la signature du devis (image 049) est la limite de Presti : l'IA prépare, l'artisan conclut ; même en Signature, jamais un prix estimé ni un paiement sans lui (`autonomie-abonnements.md`).
- La facture à la clôture du chantier [00:48]-[01:08] et le message « vous me devez » préparé (image 013) : lot L18 (facture préparée puis entretien proposé, `lib/apresChantier.ts`) et relance d'impayé (détecteurs 1 et 11, `lib/relancesImpayes.ts`), validée par l'artisan en Studio, sans culpabiliser ni inventer d'urgence (rang 10 du plan du chantier 4).
- « Retention & Referral » (image 025) : la demande d'avis et l'entretien proposé existent (`lib/apresChantier.ts:47-50`, une date seulement) ; une alerte à l'artisan sur un mauvais avis est reprenable. Le parrainage, la campagne de voisinage et l'étude de cas : à proposer à Benj, dans n8n, à partir de vrais chantiers et de vrais avis, jamais inventés.
- « Chiffré contre réel » par ligne (image 085) : c'est la marge estimée sur matériaux (A7, L21), jamais appelée « bénéfice » ; la maquette en tire « le prochain devis chiffré juste », alors que chez Presti l'écart est montré et que l'artisan fixe le prix.
- Le sous-traitant remplacé et le texto automatique au client (image 061) sont refusés : Presti n'annonce aucun retard ni délai que l'artisan n'a pas validé. L'agent vocal qui décroche [00:28]-[00:43] est exclu. Les règles et tarifs « en fichiers simples » [01:33] sont la description écrite une fois (035-002).
Ce qui ne s'applique pas, et pourquoi :
- Presti sert des artisans et leurs équipes, pas un modèle à un seul dirigeant sans salarié.
- Les outils nommés (Stripe, CRM, Claude Code en MCP) ne sont pas décrits en détail.
- Les délais (30 jours) et le remplacement de sous-traitant sont des exemples de l'auteur.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 40 agents » [00:05] : annoncé par l'auteur, non vérifié.
- « six salaires » [00:25] : annoncé par l'auteur, non vérifié.
- « 30 jours de retard » [01:13] : exemple narratif, annoncé par l'auteur, non vérifié.

---

## 52. « A Claude AI sales system sounds like 15 agents doing 15 different jobs » (21/08/2026)

Source : « A Claude AI sales system sounds like 15 agents doing 15 different jobs », @restructureai, https://www.tiktok.com/@restructureai/video/7676314259059445012 · publiée le 21/08/2026 · lue le 03/11/2026 · intégralement : oui (images, sans parole)
Ce qu'elle montre :
- Image 001 : titre « Claude AI Sales System », avec « 15 tools, 5 moves, one engine » : lu sur une maquette, non vérifié.
- Images 002 à 013 : une grille de 15 modules sur cinq lignes qui s'allument ligne par ligne : Signal, Research, Outbound, Close & Expand, Orchestrate.
- Les modules affichés : Buying Signal Monitor, Lead Discovery, Decision Maker Profiler, Account Research, Research Brief Writer, ICP & Lead Scoring, Sequence Writer, Multichannel Outreach, Speed to Reply, Call Intelligence, Proposal Generator, Renewal & Expansion Watch, VP of Sales Orchestrator, Knowledge Layer, Forecast & Daily Report.
- Image 013 : la phrase de fin « Every part of the system is one of 5 moves » : lu sur une maquette, non vérifié.
- Vidéo sans parole : seul le visuel est exploitable.
- Planche, images 003 à 013 : sous chaque module, une phrase de fonction (« trouver qui signe le chèque », « du devis au contrat, le même jour », « répondre vite, réserver la démonstration ») et des logos lisibles : LinkedIn (Decision Maker Profiler et Multichannel Outreach), « GONG » (Call Intelligence), un « pd » vert (Proposal Generator) ; chaque ligne s'allume dans sa couleur propre (vert, bleu, violet, orange, rouge).
Principes et patterns réutilisables :
- Un système présenté par étapes, pas par outils : cinq « mouvements » qui encadrent quinze modules (images 002 à 013).
- Une ligne par étape du cycle commercial, avec un module de synthèse (VP of Sales Orchestrator) au-dessus (image 013).
- Un tableau de bord qui s'allume étape par étape : il montre où un flux passe (images 002 à 013).
Erreurs à éviter :
- Dit par l'auteur : le titre parle de 15 agents faisant 15 métiers différents ; l'écran dit « 15 tools ». Les deux ne désignent pas la même chose.
- Constaté : aucune parole (transcription vide) ; les modules sont des noms sur une maquette, sans démonstration.
- Constaté : le contenu de chaque module n'est pas montré.
Ce qui s'applique à Presti / à ce client :
- La grille de modules en cinq lignes (images 002 à 013) est une carte des étapes du cycle d'un client ; pour Presti, la même forme décrit le parcours lien, demande, devis, facture (page de l'artisan `/p/[slug]`, `leads.origine`). Chaque case porte une phrase de fonction : c'est ce que doit avoir chaque gabarit `lib-*` (§5.5 de `premiere-reponse.md`).
- « Speed-to-Reply : répondre vite, réserver la démonstration » : la réponse préparée en moins d'une minute (`lib/ai.ts`), qui attend le clic en Studio et part seule en Signature (`lib/plans.ts:11`) ; réserver un rendez-vous seul n'est pas repris. « Proposal Generator : du devis au contrat, le même jour » : le devis chiffré de Presti, sans prix inventé, validé par l'artisan.
- « Renewal & Expansion Watch » ressemble à l'entretien proposé après chantier (L18, détecteur 12 du chantier 4) ; « Forecast & Daily Report » : `presti-briefing-matin` (L15) et `lib-rapport-hebdo`.
- « VP of Sales Orchestrator » en bas du tableau : le workflow parent de l'Entreprise (`ent-exemple-parent`), un routeur sans modèle ; « Knowledge Layer » (profil client idéal, prix, objections) : la fiche de découverte 035-002, relue par le client.
- Exclus : la prospection multicanale et le profilage par LinkedIn (Decision Maker Profiler, Multichannel Outreach), dont la collecte est interdite à Presti (`architecture-outils.md`) ; l'analyse d'appels (Call Intelligence) suppose d'enregistrer des appels, hors périmètre.
Ce qui ne s'applique pas, et pourquoi :
- Le système vend à des entreprises (prospection, séquences d'e-mails) : Presti ne prospecte pas pour ses artisans.
- Les noms de modules ne décrivent que des fonctions.
- La vidéo est sans parole : seul le visuel est exploitable.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 15 tools » et « 5 moves » sur l'écran-titre (image 001) : lu sur une maquette, non vérifié.
- « 15 agents » dans le titre : annoncé par l'auteur, non vérifié.
- « 15 modules » sur la grille : lu sur une maquette, non vérifié.

---

## 53. « I Built an AI Operating System for a Hedge Fund » (19/08/2026)

Source : « I Built an AI Operating System for a Hedge Fund », @restructureai, https://www.tiktok.com/@restructureai/video/7675763988331891986 · publiée le 19/08/2026 · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:10] L'auteur présente un système IA pour un fonds quantitatif : une couche de pilotage, pas un robot de trading.
- [00:15]-[00:32] Un fonds quantitatif est une boucle en dix étapes : données, recherche de signal, risque, porte de pré-négociation, exécution, opérations, mesure de performance.
- [00:37]-[00:55] Recherche : l'IA lit les dépôts, les données alternatives et l'actualité, rédige la spécification, construit des variables à la date, teste avec frais et impact de marché ; un humain l'active.
- [01:00]-[01:17] Risque : un modèle factoriel découpe le signal en expositions ; l'optimiseur cherche le meilleur rendement net de coût dans les limites du directeur des investissements.
- [01:17]-[01:36] Exécution : la porte refuse les titres restreints et les ordres sans emprunt de titre ; les ordres passent par le système de gestion d'ordres ; les exécutions sont mesurées contre un prix de référence.
- Planche, images 027 à 105 : un cercle de trois étapes (recherche, risque, porte) ; un schéma « Signal research » en trois colonnes (hypothèse, construction des variables, test) avec une case « Vet & register » (image 040) ; une porte qui laisse passer l'ordre (« cleared », route par le système d'ordres) ou le refuse, avec une croix rouge sur toute route qui le contourne (image 092) ; un bandeau final « 10 stages · 1 loop · 0 bypasses » sous « One layer on top : Claude Code, MCP » (image 105).
- Planche, image 001 : un bandeau « the economics » avec quelques montants et un nombre de postes, trop petits pour être lus : non repris.
Principes et patterns réutilisables :
- Une porte de contrôle avant l'exécution, avec une liste de refus qui bloque la sortie de l'ordre [01:17]-[01:26].
- Tester sans regarder le futur : chaque variable n'utilise que ce qui était connu ce jour-là [00:45].
- Un humain active le signal avant qu'il ne tourne [00:55].
Erreurs à éviter :
- Dit par l'auteur : « un signal n'est pas un trade, c'est une prévision » [01:00] ; une part du nouvel alpha est déjà détenue en momentum [01:03]-[01:09].
- Constaté : le texte ne montre aucun résultat de performance ; les logiciels de marché sont cités à l'oral, sans vérification possible.
- Constaté : la vidéo ne dit pas comment l'accès au système de gestion d'ordres est protégé.
Ce qui s'applique à Presti / à ce client :
- « Une porte avant l'exécution, jamais contournée » [01:17]-[01:26] (image 092) : c'est `lib-porte-conformite` (veto) puis `lib-executer` ; un message préparé passe d'abord par la conformité (opt-out, exclusions, plafond de 300 par jour, `email-brevo.md`). Aucun contournement, comme « on colle la migration PUIS on lève le drapeau » (`migration-production.md`).
- « Un humain active le signal avant qu'il ne tourne » [00:55] : même schéma que « les 2 ou 3 premiers validés par Benj, puis automatique » (`autonomie-abonnements.md`).
- « Tester sans regarder le futur » [00:45] : le mode à blanc avant la production (chaque sortie de modèle passe un schéma strict) ; pour un détecteur n8n, rejouer sur des données passées avant de l'activer, comme le test en dry-run de `migration-production.md`.
- Les ordres de bourse, le modèle factoriel et l'optimiseur de portefeuille n'ont aucun équivalent chez un artisan ; les montants de l'image 001 ne sont repris nulle part.
Ce qui ne s'applique pas, et pourquoi :
- Le domaine (fonds, titres, ordres de bourse) n'a aucun rapport avec les devis et chantiers de Presti.
- Les outils financiers (système de gestion d'ordres, modèle factoriel, optimiseur) ne concernent pas un artisan.
- La règle « jamais de contournement de la porte » relève de la sécurité et des migrations, déjà traitées ailleurs.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « dix étapes » [00:15] : annoncé par l'auteur, non vérifié.
- « 10 stages · 1 loop · 0 bypasses » (image 105) : lu sur une maquette, non vérifié.
- Aucun autre chiffre n'est donné (annoncé par l'auteur, non vérifié : sans objet).

---

## 54. « How an Agentic AI Car Dealership Will Run in 2030 » (18/08/2026)

Source : « How an Agentic AI Car Dealership Will Run in 2030 », @restructureai, https://www.tiktok.com/@restructureai/video/7675421195646405908 · publiée le 18/08/2026 · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:07] L'auteur annonce un système IA à 30 000 dollars pour un concessionnaire automobile, tel qu'il serait en 2030 (annoncé par l'auteur, non vérifié).
- [00:14]-[00:15] Huit étapes : approvisionnement, prix, mise en avant, demande, capture, réservation, vente, fidélisation, qui relance l'approvisionnement.
- [00:24]-[00:50] Demande : un véhicule resté 40 jours en stock déclenche un budget publicitaire sur ce véhicule ; le flux d'inventaire alimente les annonces et les réseaux.
- [00:50]-[01:14] Capture et réservation : appel, message et texto sont traités par trois agents qui lisent le stock en direct ; la reprise est estimée à partir de photos.
- [01:14]-[01:44] Vente en showroom : le vendeur reçoit un briefing ; les financements et assurances sont proposés, puis le contrat est signé électroniquement.
- Planche, images 014 à 105 : une étoile d'outils autour d'une « couche de données » unique, avec la formule « douze connexions séparées devient un système qui se parle » (image 014) ; une carte « Showroom & Deal (les humains concluent) » : essai, montage du dossier, orientation vers un prêteur, conformité et signature électronique (image 079) ; un tableau d'options de paiement avec mensualités (image 092) ; « Claude Code » posé sur la gestion, le CRM et les comptes publicitaires, avec la mention que rien ne marche si les outils ne se parlent pas (image 105).
Principes et patterns réutilisables :
- Un seul dossier client, pas plusieurs : la capture écrit dans le CRM, et tous les canaux lisent le même stock [01:01]-[01:07].
- Le vendeur arrive briefé : le fil complet et l'offre sont lus avant qu'il ne parle [01:19]-[01:26].
- Un stock invendu sert de déclencheur de publicité, pas de rapport mensuel [00:24]-[00:33].
Erreurs à éviter :
- Dit par l'auteur : passer de douze connexions séparées à des données qui circulent [00:07] ; c'est une cible, pas un constat.
- Constaté : aucun concessionnaire réel n'est nommé ni montré ; les outils ne sont cités qu'à l'oral.
- Constaté : le texte ne dit pas comment une erreur de prix serait repérée avant la vente.
Ce qui s'applique à Presti / à ce client :
- « Un seul dossier client » [01:01]-[01:07] et « one customer record » (image 066) : la demande de l'artisan et ses conversations dans le CRM (capacité `crm`, `lib/plans.ts`), alimentée par les canaux (`leads.origine`) ; pour l'Entreprise, `lib-capturer-lead` puis `lib-dedoublonner` écrivent au même endroit.
- Le vendeur briefé avant de parler [01:19]-[01:26] : pour l'artisan, une fiche de préparation avant la visite chez le client, faite des seules données de la demande et de ses photos, sans fait inventé. Idée nouvelle : à proposer à Benj, dans n8n.
- « Showroom : les humains concluent » (image 079) est la limite voulue : devis proposé, validé et signé par l'artisan ; les calculs de financement (image 092) et la reprise estimée sur photos [00:50]-[01:14] sont exclus, aucune décision d'argent par un modèle.
- Un véhicule resté en stock qui déclenche une publicité [00:24]-[00:33] se transpose en signal, pas en dépense : une demande sans réponse est le détecteur 6 (L3), un devis resté sans réponse suit la cadence de `lib/relances.ts:37`, jamais deux relances en 3 jours (`lib/relancesRegistre.ts:18`) ; la dépense publicitaire attend l'accord de Benj (`securite.md`).
- Appel, message et texto traités par trois agents [00:50]-[01:14] : l'appel par l'IA est exclu ; le SMS passe par `lib/sms/` (liste fermée, consentement).
Ce qui ne s'applique pas, et pourquoi :
- Le secteur (concession automobile, stock de véhicules, reprise) n'est pas celui de Presti.
- Les outils nommés (DMS, CRM, financement) ne sont pas des outils de Presti.
- Le cadre 2030 est une projection de l'auteur, pas un fait.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 30 000 dollars » [00:00] : annoncé par l'auteur, non vérifié.
- « huit étapes » [00:14] : annoncé par l'auteur, non vérifié.
- « 40 jours » sur un véhicule [00:27] : exemple narratif, annoncé par l'auteur, non vérifié.
- « douze connexions » [00:07] : annoncé par l'auteur, non vérifié.

---

## 55. « $15,000 Agentic AI Sales vs Agentic AI Marketing » (17/08/2026)

Source : « $15,000 Agentic AI Sales vs Agentic AI Marketing », @restructureai, https://www.tiktok.com/@restructureai/video/7675032815645281557 · publiée le 17/08/2026 · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:09] Le cadre : 15 000 dollars pour un seul système IA cette année, vente ou marketing ? (annoncé par l'auteur, non vérifié).
- [00:16]-[00:27] Système de vente : 12 agents, 60 outils, 28 connexions en direct vers des CRM et des outils de prospection ; signaux, recherche, prospection, opérations commerciales.
- [00:32]-[00:39] Calcul : une prospection froide répond à environ 1 %. Pour 2 000 e-mails : 20 réponses, quatre rendez-vous, peut-être une affaire.
- [00:43]-[01:05] Système de marketing : 10 agents, plus de 50 plateformes ; analyse des concurrents, production, distribution, mesure du coût par acquisition, boucle fermée.
- [01:10]-[01:37] Règle de choix : le marketing se diffuse et se rentabilise sur 90 jours ; la vente réagit à des événements. Pas assez de prospects : marketing ; prospects non suivis : vente.
- Planche, images 023 à 078 : une carte « Twelve agents · sixty tools » avec les logos HubSpot, Apollo et Clay (image 023) ; une carte « Ten agents · fifty+ platforms » où un bloc « Intelligence » écrit deux fichiers (profils de clients idéaux, déclencheurs d'achat) que chaque autre agent lit avant d'agir, l'analyse renvoyant le coût d'acquisition au début (images 056 et 067) ; une carte « fan-out contre événement » : une vidéo diffusée à tous qui s'accumule sur 90 jours, face à une réaction à un événement (image 078).
Principes et patterns réutilisables :
- Choisir selon le manque : « pas assez de prospects » mène au marketing, « prospects non suivis » mène à la vente [01:28]-[01:32].
- Calculer le rendement avant de bâtir : 2 000 envois à 1 % donnent 20 réponses [00:32]-[00:39].
- Une boucle fermée : le coût par acquisition revient dans l'analyse chaque nuit [00:56]-[01:00].
Erreurs à éviter :
- Dit par l'auteur : le marketing « vous donne cinq fois plus de leads » [01:05] ; le texte ne dit pas sur quelle base.
- Constaté : le calcul part d'un taux de réponse de 1 % sans source ; un autre taux change la conclusion.
- Constaté : la comparaison ne tient pas compte du coût réel de chaque système.
Ce qui s'applique à Presti / à ce client :
- « Pas assez de prospects, marketing ; prospects non suivis, vente » [01:28]-[01:32] : chez Presti le prospect arrive déjà sur la page de l'artisan, et le manque est presque toujours le suivi : demandes sans réponse (détecteur 6), devis sans réponse (relances J+2, J+5, J+10, `lib/relances.ts:37`), impayés (détecteur 1), classés par argent récupéré (§9 du plan du chantier 4).
- Le calcul de 2 000 envois à 1 % [00:32]-[00:39] est de la prospection froide, donc le chantier 3 : plafond de 300 e-mails par jour (`email-brevo.md`) ; le taux de 1 % n'est pas sourcé : à mesurer sur Presti avant de le citer.
- Les deux fichiers « profils de clients idéaux » et « déclencheurs d'achat » lus par tous (image 056) : l'ICP et les playbooks du réseau neuronal pour Presti, la fiche de découverte 035-002 pour un client Entreprise ; la boucle où le coût par acquisition revient (image 067) : `leads.origine` et `lib-rapport-hebdo`.
- Les budgets de 15 000 dollars, les 90 jours de diffusion et la publicité payante : hors Presti, sans accord de Benj (`securite.md`).
Ce qui ne s'applique pas, et pourquoi :
- La prospection froide n'est pas l'activité de Presti : Presti travaille avec des artisans et leurs clients.
- Le budget de 15 000 dollars est celui de l'auteur, pas une grille de prix de Presti.
- Le modèle des 90 jours suppose une diffusion qui n'existe pas dans Presti.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 15 000 dollars » [00:00] : annoncé par l'auteur, non vérifié.
- « 12 agents, 60 outils, 28 connexions » [00:16] : annoncé par l'auteur, non vérifié.
- « environ 1 % » de réponses et « 2 000 e-mails » [00:32] : annoncé par l'auteur, non vérifié.
- « 10 agents, plus de 50 plateformes » [00:43] : annoncé par l'auteur, non vérifié.
- « 90 jours » [01:12] : annoncé par l'auteur, non vérifié.

---

## 56. « A Claude AI marketing system sounds like 15 agents doing 15 different jobs » (15/08/2026)

Source : « A Claude AI marketing system sounds like 15 agents doing 15 different jobs », @restructureai, https://www.tiktok.com/@restructureai/video/7674078902314175765 · publiée le 15/08/2026 · lue le 03/11/2026 · intégralement : oui (images, sans parole)
Ce qu'elle montre :
- Image 001 : titre « Claude AI Marketing System », avec « 15 tools, 5 moves, one engine » : lu sur une maquette, non vérifié.
- Images 002 à 013 : une grille de 15 modules sur cinq lignes qui s'allument ligne par ligne : Research, Attract, Convert, Retain, Orchestrate.
- Les modules affichés : Market Research, Competitor Intel, Demand Signals, Local SEO, Google Business Profile, Social Content, Ads, Speed-to-Lead, Intake & Qualify, Follow-Up, Reviews, Referrals, Orchestrator, Analytics & Attribution, Daily Report.
- Image 013 : la phrase de fin « Every part of the system is one of 5 moves » : lu sur une maquette, non vérifié.
- Vidéo sans parole : seul le visuel est exploitable.
- Planche, images 002 à 013 : chaque carte porte une phrase de fonction (« répondre en moins d'une minute », « répondre, classer, recommencer » pour les avis, « les clients amènent des clients », « une page chaque matin ») et des logos lisibles (Google, trois réseaux sociaux, Gmail) ; chaque ligne s'allume dans sa couleur propre ; image 013 : toutes les cartes sont allumées, l'orchestrateur est décrit comme « il route les quatre étapes ».
Principes et patterns réutilisables :
- Cinq « mouvements » qui encadrent quinze modules : une vue par étape, pas par outil (images 002 à 013).
- Des modules de synthèse (Orchestrator, Analytics & Attribution, Daily Report) en bas de chaque ligne (images 011 à 013).
- Une ligne « Retain » distincte de « Attract » : garder un client est une étape à part (images 007 à 013).
Erreurs à éviter :
- Dit par l'auteur : le titre parle de 15 agents faisant 15 métiers différents ; l'écran dit « 15 tools ». Les deux ne désignent pas la même chose.
- Constaté : la transcription est vide (Whisper a produit un seul mot sur une vidéo sans parole) ; les modules ne sont que des noms sur une maquette.
- Constaté : le contenu de chaque module n'est pas montré.
Ce qui s'applique à Presti / à ce client :
- La grille (images 002 à 013) est une carte de ce que Presti couvre côté demande : « Speed-to-Lead » = la réponse préparée en moins d'une minute (`lib/ai.ts`) ; « Intake & Qualify » = `lib-qualifier-lead` (note et priorité calculées par le code) ; « Follow-Up : ne jamais lâcher une demande » = relances J+2, J+5, J+10 (`lib/relances.ts:37`), jamais deux en 3 jours (`lib/relancesRegistre.ts:18`).
- « Reviews » et « Referrals » (ligne Retain, images 008 à 013) : la demande d'avis après chantier existe (`lib/apresChantier.ts:47-50`) ; répondre à un avis se rédige d'après de vrais avis ; le parrainage est une idée nouvelle : à proposer à Benj, dans n8n.
- « Local SEO », « Google Business Profile » et « Social Content » (ligne Attract) : le début est la page `/site/[slug]` de l'artisan ; tout contenu publié pour Presti suit la règle des 2 ou 3 premiers validés puis automatique (`autonomie-abonnements.md`) ; aucune publication sur un compte non Presti (`securite.md`).
- « Ads » et « Demand Signals » : publicité payante, hors Presti sans accord de Benj ; « Daily Report : une page chaque matin » : `presti-briefing-matin` (L15).
Ce qui ne s'applique pas, et pourquoi :
- Le système vend des services de marketing à des entreprises : Presti ne fait pas de publicité pour ses artisans.
- Les noms de modules ne décrivent que des fonctions, sans contenu montré.
- La vidéo est sans parole : seul le visuel est exploitable.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 15 tools » et « 5 moves » sur l'écran-titre (image 001) : lu sur une maquette, non vérifié.
- « 15 agents » dans le titre : annoncé par l'auteur, non vérifié.
- « 15 modules » sur la grille : lu sur une maquette, non vérifié.

---

## 57. « How Agentic AI Is Shaping the Future of Sales » (14/08/2026)

Source : « How Agentic AI Is Shaping the Future of Sales », @restructureai, https://www.tiktok.com/@restructureai/video/7673733192741915924 · publiée le 14/08/2026 · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:08] L'auteur décrit un service commercial « natif IA » : 12 agents, 60 outils réels, une base partagée, un orchestrateur (annoncé par l'auteur, non vérifié).
- [00:08]-[00:24] Trois conditions : une pile d'outils pilotée et non remplacée (28 connexions en direct, annoncé par l'auteur, non vérifié) ; cartographier les fonctions de vente ; une base de connaissance partagée.
- [00:39]-[00:50] Un poste de vente découpé en tâches : huit postes (VP, SDR, AE, RevOps) reconstruits en 12 agents, dont un ne remplace personne.
- [00:55]-[01:04] Une seule base de connaissance : ICP, prix, objections, affaires gagnées ou perdues, lue par chaque agent ; le tableau de bord est la porte d'entrée.
- [01:07]-[01:31] L'agent « VP des ventes » répartit les prospects, tient les prévisions et décide quand un humain intervient ; l'IA fait la recherche, les signaux, le suivi et l'hygiène du CRM ; l'humain prend les décisions à fort enjeu.
- Planche, images 001 à 081 : l'orchestrateur est un bloc en plusieurs pas (router, prioriser, assigner, surveiller, prévoir, escalader) posé sur des bibliothèques d'orchestration dont n8n (images 001 et 071) ; la base commune est un dossier de fichiers (profil client idéal, prix, objections, historique des affaires, image 061) ; une zone « l'IA suggère » liste des propositions (escalader une affaire bloquée, relancer des contacts froids, réattribuer des opportunités dormantes, image 081).
Principes et patterns réutilisables :
- Une base de connaissance lue par chaque agent avant d'agir [00:55]-[01:00].
- Un orchestrateur qui route et escalade vers un humain, sans faire les tâches [01:13]-[01:21].
- Séparer les tâches répétitives (suivi, CRM) des décisions à fort enjeu [01:21]-[01:26].
Erreurs à éviter :
- Dit par l'auteur : il ne s'agit pas de remplacer les intitulés de poste, mais de les découper en tâches [00:39].
- Constaté : aucune démonstration, ni tableau de bord ni résultat ; le texte ne dit pas comment un échec est repris.
- Constaté : la pile citée (CRM, prospection, signature) n'est pas celle de Presti ; la vidéo ne le précise pas.
Ce qui s'applique à Presti / à ce client :
- Une base de connaissance lue par chaque agent avant d'agir [00:55]-[01:00] (image 061) : la fiche de découverte d'un client Entreprise (035-002), relue par lui, et pour l'artisan « Décrire mon entreprise » (A6, L14) ; les prix viennent de sa liste, jamais d'une déduction.
- L'orchestrateur qui route, surveille et « décide quand un humain intervient » (images 001 et 081) est `ent-exemple-parent` : un workflow parent qui route sans modèle (§4.2 de `premiere-reponse.md`) ; la maquette en fait un agent, Presti non. Les propositions « l'IA suggère » (image 081) sont les cartes de « À valider » (L5), classées par argent récupéré (§9 du plan du chantier 4).
- « Piloter la pile d'outils au lieu de la remplacer » [00:08]-[00:24] (image 031, « ne remplace pas votre pile ») : `gabarit-synchroniser-outil` (rang 3), liste d'accès signée par le client, lecture seule d'abord (`0189_role_lecture_n8n.sql`).
- Séparer le répétitif des décisions à fort enjeu [01:21]-[01:26] : Studio prépare et l'artisan valide ; Signature envoie seul les types prévus (`lib/plans.ts:11`, `lib/pilote/regles.ts`).
Ce qui ne s'applique pas, et pourquoi :
- Le sujet est le service commercial d'une entreprise B2B : Presti n'a pas de service commercial à automatiser.
- La pile citée (CRM, outils de prospection, signature) ne correspond pas aux outils de Presti.
- Les chiffres de postes sont ceux de l'auteur, pas une mesure.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 12 agents, 60 outils réels » [00:08] : annoncé par l'auteur, non vérifié.
- « 28 connexions » [00:28] : annoncé par l'auteur, non vérifié.
- « huit postes » et « 12 agents » [00:39]-[00:44] : annoncé par l'auteur, non vérifié.

---

## 58. « How a $15,000 Agentic AI Marketing Department Actually Works » (13/08/2026)

Source : « How a $15,000 Agentic AI Marketing Department Actually Works », @restructureai, https://www.tiktok.com/@restructureai/video/7673353459688574226 · publiée le 13/08/2026 · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:07] Système marketing à 15 000 dollars pour une entreprise locale : 10 agents spécialisés, plus de 50 plateformes (annoncé par l'auteur, non vérifié).
- [00:16]-[00:27] Le flux : intelligence (trouve l'angle), stratégie (plan et budget), production (contenus), distribution (publicité payante, réseaux, e-mail, site), mesure, retour à l'intelligence.
- [00:30]-[00:46] Module 1, intelligence de marché : publicités des concurrents, pages d'atterrissage, avis et appels de vente ; sortie : trois profils de clients idéaux et une liste de déclencheurs d'achat, dans un dossier partagé.
- [00:49]-[01:04] Module 2, analyse et attribution : chaque nuit, dépenses publicitaires, conversions, revenus fermés et coût par acquisition par canal, réécrits dans le dossier partagé.
- [01:04]-[01:26] Intégration : une couche de contexte commune, des accès en direct aux outils, et un orchestrateur qui route et tient le budget ; l'humain ne fait plus les tâches mais les décisions.
- Planche, images 012 à 089 : un schéma d'architecture où Supabase sert de base et de registre de services, avec Notion, un équilibreur de charge, un cache et un serveur d'authentification (images 012, 023, 067) ; un module « Market Intelligence » qui lit publicités, pages, offres, avis et appels de vente avant d'écrire (image 034) ; un module « Analytics & Attribution » étiqueté « construisez-le d'abord », avec un relevé de nuit des dépenses, des conversions et du revenu (image 056) ; une carte finale « supervisé, pas autonome » (image 089).
Principes et patterns réutilisables :
- Lancer l'analyse de marché avant toute rédaction [00:30]-[00:32].
- Construire l'analyse des dépenses dès le départ, et non en dernier [00:52]-[00:53].
- Un orchestrateur supervisé, pas autonome [01:29]-[01:30].
Erreurs à éviter :
- Dit par l'auteur : on passe de la gestion de huit personnes à la revue d'environ six décisions par semaine [01:26] ; le texte ne dit pas comment ce calcul est fait.
- Constaté : aucun résultat de campagne n'est montré ; les chiffres de coût ne sont pas sourcés.
- Constaté : le texte ne dit pas comment un mauvais budget serait détecté.
Ce qui s'applique à Presti / à ce client :
- « Supervisé, pas autonome » (image 089) : même règle que Studio (rien ne part sans le clic, `lib/plans.ts:11`) ; le compte de « décisions par semaine » est refusé : un gain sans source n'entre dans aucun rapport (`lib-rapport-hebdo`).
- La pile montrée (Supabase comme base et registre, des workflows n8n) est celle de Presti (`architecture-outils.md`) : Supabase source de vérité, n8n pour l'automatisation ; la vidéo n'en dit pas plus que le schéma.
- « Mesurer avant de produire » [00:52]-[00:53] (image 056) : pour Presti, la mesure en demandes reçues et devis signés par origine (`leads.origine`, `0177_canaux_reseaux.sql`) dans le rapport hebdomadaire ; relier à la dépense publicitaire est hors Presti sans accord de Benj.
- « Intelligence de marché avant tout texte » [00:30]-[00:32] (image 034) : pour la prospection, le tri par ICP du chantier 3 avec SearXNG, Firecrawl auto-hébergé, Crawlee et ScrapeGraphAI sur Oracle (ni Firecrawl en ligne, ni Apify, ni LinkedIn) ; aucune donnée de prospect vers un modèle gratuit en ligne (`securite.md`).
Ce qui ne s'applique pas, et pourquoi :
- Le service vendu est un marketing complet pour une entreprise locale avec publicité payante : Presti ne vend pas cette prestation.
- Les outils nommés (CRM, publicité, analytics) ne sont pas ceux de Presti.
- Le prix de 15 000 dollars est celui de l'auteur, pas une grille de Presti.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 15 000 dollars » dans le titre et [00:00] : annoncé par l'auteur, non vérifié.
- « 10 agents spécialisés » et « plus de 50 plateformes » [00:06]-[00:07] : annoncé par l'auteur, non vérifié.
- « trois profils de clients idéaux » [00:41] : annoncé par l'auteur, non vérifié.
- « huit personnes » et « six décisions par semaine » [01:26] : annoncé par l'auteur, non vérifié.

---

## 59. « This Is How an Agentic AI Business Will Run in 2035 » (11/08/2026)

Source : « This Is How an Agentic AI Business Will Run in 2035 », @restructureai, https://www.tiktok.com/@restructureai/video/7672824038061788434 · publiée le 11/08/2026 · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:11] L'auteur annonce une projection sur dix ans (annoncé par l'auteur, non vérifié) : cinq départements en haut, leurs outils dessous, et à droite ce qui les fait tourner.
- [00:23]-[00:34] Couche 1, la pile d'outils : signaux et données locales, publicité, CRM et réservation, communications, planning, finance, reporting ; « ce sont les outils qu'elle paie déjà ».
- [00:47]-[01:09] Couche 2, la boucle : cinq départements, 14 modules ; le marketing trouve la personne, la vente qualifie et chiffre, les opérations font le travail, le suivi relance, la finance indique où va l'argent.
- [01:12]-[01:25] Couche 3, l'orchestrateur : il regarde la boucle (leads perdus entre vente et opérations, file qui gonfle) et déplace le travail avant que l'humain ne le remarque.
- [01:27]-[01:36] Au-dessus, l'humain : l'offre, les règles de prix et la définition d'un bon travail ; ces trois choses ne quittent jamais ses mains.
- Planche, images 012 à 089 : une pile d'outils que l'entreprise paie déjà (CRM, publicité, réservation, e-mail, messagerie, paiement, comptabilité, mesure d'audience, image 034) ; une boucle en cercle (trouver le prospect, réserver le chantier, le chantier est fini, les ramener) avec la finance au centre (image 067) ; en haut, l'humain tient l'offre, les règles de prix et le niveau de qualité (image 078) ; l'orchestrateur suit détecter, prioriser, router, déplacer le travail (image 089).
- Planche, image 056 : l'écran parle de 14 agents répartis en cinq modules, alors que le résumé de la transcription parle de 14 modules : les deux ne désignent pas la même chose.
Principes et patterns réutilisables :
- Trois couches : outils, boucle métier, supervision ; chaque couche ne fait que ce qui est au-dessus de sa ligne [01:12]-[01:19].
- L'orchestrateur surveille la boucle, il ne fait pas le travail [01:18]-[01:19].
- L'humain garde trois décisions : offre, prix, qualité [01:30]-[01:34].
Erreurs à éviter :
- Dit par l'auteur : vingt connexions séparées deviennent une seule [00:38] ; c'est une promesse, sans démonstration.
- Constaté : le schéma ne montre aucun flux réel ; le texte ne dit pas comment une erreur de l'orchestrateur serait détectée.
- Constaté : le titre annonce 2035, mais la vidéo ne donne aucune méthode pour cette échéance.
Ce qui s'applique à Presti / à ce client :
- Le cercle de la boucle (image 067 : trouver, réserver, finir, ramener) est le cycle de l'artisan : lien, demande, devis, facture, après-chantier (L18), entretien proposé (détecteur 12). Presti couvre la boucle sans nouvelle pile ; la finance « au centre » est la facture préparée et validée par l'artisan, sans accès bancaire.
- Les trois couches (outils, boucle, supervision, images 034, 056 et 089) rejoignent la hiérarchie du §4.2 de `premiere-reponse.md` : rang 0 gérant, rang 1 orchestrateur et conformité, rang 2 spécialistes.
- « L'humain garde l'offre, les prix et la qualité » (image 078) : Studio prépare et l'artisan valide, jamais un prix estimé ni un paiement sans lui (`autonomie-abonnements.md`). L'orchestrateur qui « déplace le travail avant que l'humain ne le remarque » reste un workflow n8n qui propose (détecteurs, cartes), jamais une action sortante de son propre chef.
- « La pile que l'entreprise paie déjà » (image 034) : `gabarit-synchroniser-outil`, en lecture, sur une liste d'accès signée par le client.
Ce qui ne s'applique pas, et pourquoi :
- La vidéo décrit une entreprise entière (cinq départements) : Presti n'est pas un ERP.
- La date 2035 est une projection de l'auteur, pas un fait.
- Les 14 modules ne sont pas détaillés.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « dix ans » [00:00] : annoncé par l'auteur, non vérifié.
- « cinq départements » [00:11] : annoncé par l'auteur, non vérifié.
- « 14 modules » [00:53] : annoncé par l'auteur, non vérifié ; l'écran (image 056) dit « 14 agents » répartis en cinq modules : lu sur une maquette, non vérifié.
- « vingt connexions séparées » [00:38] : annoncé par l'auteur, non vérifié.

---

## 60. « I Built 31 AI Agents to Run an Entire Law Firm » (10/08/2026)

Source : « I Built 31 AI Agents to Run an Entire Law Firm », @restructureai, https://www.tiktok.com/@restructureai/video/7672444503504063752 · publiée le 10/08/2026 · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:10] L'auteur présente 31 agents IA (annoncé par l'auteur, non vérifié) qui font tourner un cabinet d'avocats, avec six départements.
- [00:14]-[00:23] Chaîne : l'accueil alimente le CRM, le CRM ouvre le dossier, le dossier alimente le temps et la facturation, la facturation alimente la trésorerie ; un agent remonte les priorités.
- [00:25]-[00:40] Module 1, CRM : pipeline de 348 000 sur huit affaires, pondéré à 211 000 ; chaque affaire est étiquetée par étape et par source ; taux de gain de 67 % (lu sur une maquette, non vérifié).
- [00:42]-[00:56] Module 2, dossiers : huit dossiers ouverts sur six domaines ; 35 000 de travail réalisé non facturé, 289 000 sur le compte client (lu sur une maquette, non vérifié).
- [00:59]-[01:19] Module 3, finance : chiffre d'affaires, charges, marge, 97 000 de factures en attente, réparties par âge ; une facture de 12 800 en retard de 72 jours (lu sur une maquette, non vérifié).
- [01:21]-[01:28] Bouton « Brief the firm » : l'agent lit chaque dossier, échéance et facture, et livre une liste classée.
- Planche, images 001 à 071 : un schéma en zones colorées dont une porte « conflits » qui rend « cleared » ou « waived » avant l'ouverture d'un dossier (image 001) ; un entonnoir d'étapes (contacté, découverte, proposition, négociation, contrat envoyé, gagné) derrière le tableau « Deal pipeline » (images 031 et 041) ; un tableau de factures par tranches d'ancienneté, avec les boutons « Send reminder » et « Record payment » sur chaque ligne (image 071) ; une sortie « Brief the Firm » qui rend une liste de décisions classées (image 021).
Principes et patterns réutilisables :
- Une chaîne de données dans le même ordre que l'activité : accueil, dossier, facturation, trésorerie [00:14]-[00:18].
- Classer les dossiers par urgence, pas par tableau de bord : « une décision, pas un tableau de bord » [01:28].
- Trier les factures par ancienneté, avec le retard le plus long en tête [01:10]-[01:14].
Erreurs à éviter :
- Dit par l'auteur : « 67 % de taux de gain » [00:40] ; le texte ne dit pas sur quelle période ni sur combien de dossiers.
- Constaté : les chiffres sont lus sur des écrans de démonstration, sans vérification ; aucun cabinet réel n'est nommé.
- Constaté : la chaîne « accueil, CRM, dossier, facturation » ne montre aucune erreur de transmission.
Ce qui s'applique à Presti / à ce client :
- Le tableau des factures par ancienneté, avec « Send reminder » et « Record payment » par ligne (image 071), est l'écran des impayés de l'artisan : relance préparée et validée en Studio (`lib/relancesImpayes.ts`, détecteurs 1 puis 11 pour la réponse), qui part seule en Signature une fois la case cochée (`lib/plans.ts:67`) ; l'enregistrement d'un paiement reste un geste de l'artisan, sans accès bancaire.
- Trier par ancienneté, le retard le plus long en tête [01:10]-[01:14] : l'ordre de « À valider, l'argent d'abord » (L5) et du résumé du matin (L15), classé par argent récupéré (§9 du plan du chantier 4) ; une relance ne culpabilise pas et n'invente aucune urgence (rang 10).
- La porte « conflits » (image 001) correspond à `lib-porte-conformite` (veto) placée avant `lib-executer` ; les comptes clients et la trésorerie bancaire de la maquette sont exclus (aucun accès comptable).
- « Brief the Firm » [01:21]-[01:28] est le résumé du matin (`presti-briefing-matin`, L15) : une liste classée, un geste par carte (L16). Les montants du pipeline et le taux de gain de l'image 031 sont des chiffres de maquette, à ne reprendre dans aucun rapport.
Ce qui ne s'applique pas, et pourquoi :
- Le secteur (cabinet d'avocats, comptes clients, conflits d'intérêts) n'est pas celui des artisans de Presti.
- Les étiquettes de dossiers (litige, successions) ne concernent pas Presti.
- Les montants sont des exemples d'écran, à ne pas reprendre.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 31 agents » et « six départements » [00:00]-[00:05] : annoncé par l'auteur, non vérifié.
- « 348 000 sur huit affaires, 211 000 pondérés » [00:28] : lu sur une maquette, non vérifié.
- « 67 % de taux de gain » [00:40] : lu sur une maquette, non vérifié.
- « 35 000 », « 289 000 » et « 97 000 » [00:51]-[01:02] : lus sur une maquette, non vérifié.
- « 72 jours » et « 12 800 » [01:14] : lus sur une maquette, non vérifié.

---

## 61. « I Built an AI Agent Running an Entire Company » (07/08/2026)

Source : « I Built an AI Agent Running an Entire Company », @restructureai, https://www.tiktok.com/@restructureai/video/7671297068186537223 · publiée le 07/08/2026 · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:13] L'auteur annonce 133 agents IA (annoncé par l'auteur, non vérifié) qui font tourner une entreprise à sept départements, pour environ 500 dollars de jetons par mois.
- [00:13]-[00:24] Trois agents décisifs : le directeur financier (relevé bancaire, factures, trésorerie, clients rentables), puis le directeur des opérations (livraisons bloquées, fournisseur qui glisse, personnes à 140 % de capacité).
- [00:39]-[00:47] Le directeur commercial : affaires bloquées, comptes à développer, argent laissé sur la table.
- [00:51]-[01:00] Le « chef de cabinet » du lundi réunit les trois : le DAF veut couper, le DC veut dépenser, le DO dit que ni l'un ni l'autre ne peut ; chaque recommandation se note elle-même.
- [01:00]-[01:06] Chaque recommandation est classée : menée par l'humain, assistée, ou entièrement autonome.
- Planche, images 001 à 065 : un « cerveau d'entreprise » (couche de contexte partagée) au-dessus de trois directions puis de services d'appui (image 001) ; un tableau de bord « où est l'argent » lit des relevés bancaires et des factures (image 025) ; un nœud « capacité dépassée ? » déclenche un signalement ou une répartition automatique (image 041) ; sur l'écran du lundi, chaque décision porte l'étiquette « menée par l'humain », « assistée » ou « entièrement autonome », avec la légende de ces trois niveaux (image 065).
Principes et patterns réutilisables :
- Un agent par fonction de direction, avec un rôle de lecture précis (finances, opérations, ventes) [00:13]-[00:47].
- Une recommandation qui se note elle-même selon le degré d'autonomie accepté [01:00]-[01:06].
- Un arbitrage hebdomadaire entre les trois fonctions, avant toute décision [00:51]-[00:55].
Erreurs à éviter :
- Dit par l'auteur : « des centaines de milliers de dollars de salaires » remplacés [00:06] ; aucun montant n'est sourcé.
- Constaté : la vidéo ne montre aucun écran réel ; le texte ne dit pas comment l'agent accède aux données bancaires.
- Constaté : la notation « menée par l'humain, assistée, autonome » n'est pas expliquée.
Ce qui s'applique à Presti / à ce client :
- Les trois niveaux (image 065 : menée par l'humain, assistée, autonome) structurent déjà les offres : Studio prépare et l'artisan valide (« assistée ») ; Signature envoie seul les seuls types prévus, par type d'action après 10 minutes d'annulation possible (`lib/plans.ts:87-89`, `lib/pilote/regles.ts`) ; une décision d'argent reste toujours humaine : jamais un prix estimé ni un paiement sans l'artisan.
- Le « chef de cabinet » du lundi qui réunit les arbitrages [00:51]-[01:06] : pour l'Entreprise, `lib-rapport-hebdo` (un chiffre sans source est refusé) ; pour l'artisan, le résumé du matin (L15). Presti n'imite pas la dispute entre trois agents : le code classe, l'artisan choisit.
- Le lecteur de relevés bancaires (image 025) est exclu : Presti n'a aucun accès bancaire ni comptable ; les chiffres d'argent viennent de ses devis et de ses factures, jamais d'un relevé.
- « Chaque recommandation se note elle-même » [00:51]-[01:06] est refusé : un modèle qui note sa propre fiabilité produit un chiffre sans mesure ; la note de convenance vient du code (`lib-qualifier-lead`).
Ce qui ne s'applique pas, et pourquoi :
- Une entreprise à sept départements n'est pas le périmètre de Presti.
- Les agents de direction (DAF, DO, DC) ne correspondent pas aux rôles d'un artisan.
- Le lecteur de comptes bancaires est un accès sensible : il ne doit pas être repris sans cadrage de sécurité.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 133 agents » et « sept départements » [00:00] : annoncé par l'auteur, non vérifié.
- « environ 500 dollars de jetons par mois » [00:06] : annoncé par l'auteur, non vérifié.
- « 140 % de capacité » [00:39] : exemple narratif, annoncé par l'auteur, non vérifié.

---

## 62. « AI Marketing System for Local Service Businesses » (06/08/2026)

Source : « AI Marketing System for Local Service Businesses », @restructureai, https://www.tiktok.com/@restructureai/video/7670954705362619668 · publiée le 06/08/2026 · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:10] L'auteur présente un système marketing à plus de 12 000 dollars (annoncé par l'auteur, non vérifié), offert gratuitement, pour les dépanneurs, plombiers, couvreurs et électriciens.
- [00:10]-[00:22] Neuf modules (annoncé par l'auteur, non vérifié) ; le directeur marketing choisit lesquels tournent aujourd'hui, selon le métier et le rayon de service, et non selon un calendrier.
- [00:23]-[00:34] Module « radar de la demande » : il surveille la ville (front froid jeudi, pic de recherche dans un code postal, concurrent dont les avis chutent) et déplace le budget.
- [00:39]-[00:48] Pile de visibilité : fiche Google Business Profile, publicités de service local, pages de zone, vidéos courtes, groupes de quartier.
- [00:52]-[01:06] Module de réponse instantanée : quand l'eau coule dans un plafond, le client appelle plusieurs entreprises ; l'auteur affirme que la plupart retiennent la première qui répond.
- Planche, images 001 à 065 : des modules en cases colorées sous un « directeur marketing » ; un flux d'activité qui note ce que chaque module a fait (budget déplacé vers un code postal, urgence répondue, avis obtenu, enchère relevée, entretien re-réservé, image 025) ; un radar de demande qui lit météo, recherches et avis perdus par un concurrent (image 033) ; un échange où l'IA répond à une fuite d'eau par une consigne (couper l'arrivée d'eau) et demande l'adresse (image 065), puis un schéma « Instant Response » : urgence oui, dépêcher un technicien ; non, devis standard ; mise à jour du CRM.
Principes et patterns réutilisables :
- Lancer les modules selon l'événement local du jour, pas selon un calendrier fixe [00:15]-[00:22].
- Une même mémoire alimente la visibilité (fiche, publicités, pages de zone) [00:43]-[00:48].
- Répondre en premier : la réponse rapide est le module à construire en priorité [01:01]-[01:06].
Erreurs à éviter :
- Dit par l'auteur : « 70 % des meilleures places du pack local » vont à des entreprises proches du chercheur [00:52] ; aucune source n'est donnée.
- Constaté : aucune preuve de résultat (appels, devis, chiffre d'affaires) n'est montrée ; les statistiques sont dites à l'oral.
- Constaté : la vidéo ne dit pas comment un module se trompe de ville.
Ce qui s'applique à Presti / à ce client :
- « Répondre en premier » [01:01]-[01:06] (image 065) : la réponse préparée en moins d'une minute est le cœur de Presti (`lib/ai.ts`) ; l'embranchement « urgence ? » existe déjà : une fuite d'eau est reconnue et escaladée à l'artisan (`lib/pilote/regles.ts:191`). Refusés : dépêcher un technicien, promettre une heure ou un délai, donner une consigne technique à la place de l'artisan (anti-fabrication, `lib/ai.ts`).
- Le radar de « l'événement local du jour » [00:15]-[00:34] (image 033) : l'idée d'un déclencheur par signal (météo) est à proposer à Benj, dans n8n, pour des relances de saison (entretien) qui ne proposent qu'une date et partent au clic en Studio ; déplacer un budget publicitaire n'est pas à Presti sans accord de Benj.
- « Revenue Recovery : re-réserver un entretien en retard » (image 025) est l'entretien proposé après chantier (L18, `lib/apresChantier.ts:47-50`, détecteur 12) : proposer une date, jamais fixer un rendez-vous seul.
- « Visibility Stack : fiche Google, pages de zone, groupes de quartier » (image 049) : le début est la page `/site/[slug]` ; les réseaux et groupes de voisinage ne sont pas gérés par Presti (comptes non Presti intouchables, `securite.md`). Les parts de marché locales et les taux de réponse annoncés ne sont pas sourcés : non repris.
Ce qui ne s'applique pas, et pourquoi :
- Le client visé (dépanneurs, couvreurs, électriciens) est proche de Presti, mais l'offre gratuite de l'auteur ne reflète pas un tarif de Presti.
- Les chiffres de part de marché locale et de réponse ne sont pas sourcés.
- Les neuf modules ne sont pas détaillés au-delà de leur nom.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « plus de 12 000 dollars » [00:00] : annoncé par l'auteur, non vérifié.
- « neuf modules » [00:10] : annoncé par l'auteur, non vérifié.
- « 70 % » et « 3 miles » [00:52] : annoncé par l'auteur, non vérifié.
- « trois entreprises en 10 minutes » et « 78 % » [01:01]-[01:06] : annoncé par l'auteur, non vérifié.

---

## 63. « 10 AI Systems for 10 Different Industries » (05/08/2026)

Source : « 10 AI Systems for 10 Different Industries », @restructureai, https://www.tiktok.com/@restructureai/video/7670540933015850258 · publiée le 05/08/2026 · lue le 03/11/2026 · intégralement : oui (images, sans parole)
Ce qu'elle montre :
- Images 001 à 004 : un homme devant un clavier (la main au menton à l'image 004), avec le titre à l'écran « 10 Industries = 10 Boring Automations » : lu sur une maquette, non vérifié.
- Image 005 : « 1. Catalog E-commerce » : problèmes (produits difficiles à trouver, questions de compatibilité) ; solution « AI Product Finder + CA ».
- Image 006 : « 2. Retail Brands » : solution « AI Commerce + Retention Agent » (paniers abandonnés, relances).
- Images 007, 008 et 009, une par image : « 3. Med Spas & Wellness » (solution « AI Booking + CCA »), « 4. Clinics & Healthcare » (« AI Reception + PRA »), « 5. Accounting & Advisory » (« AI Client Onboarding + AA ») ; chaque solution s'accompagne d'une abréviation entre parenthèses (concierge, rappel de patients, conseil).
- Images 010, 011, 012 puis 013 et 014 (ces deux dernières identiques) : « 6. Finance & Mortgage » (« AI Qualification + DA »), « 7. Legal » (« AI Intake + CCA »), « 9. Home Service Trades » (« AI Lead + Dispatch Agent »), « 10. Automotive » (« AI Sales + Service Advisor ») ; aucune des quatorze images ne montre le cas 8.
- Image 012 : le schéma des métiers du dépannage à domicile enchaîne appel ou message « 24/7 », identification du service, test « urgence ? » (oui : technicien le plus proche ; non : créneau standard), confirmation et mises à jour d'arrivée, puis mise à jour automatique du CRM.
- Vidéo sans parole : seul le visuel est exploitable.
Principes et patterns réutilisables :
- Une fiche par secteur : problèmes communs en haut, solution nommée, schéma de flux en bas (images 005 à 014).
- Un flux court par secteur : demande, qualification, rendez-vous, rappel, sortie vers l'humain.
- Décrire le problème du client avant la solution : chaque fiche commence par ce qui coûte aujourd'hui.
Erreurs à éviter :
- Dit par l'auteur : « 10 boring automations » (titre) ; le mot « boring » est une formule de vente, rien de plus.
- Constaté : vidéo sans parole, sans transcription ; les schémas sont des maquettes, sans résultat ni client réel.
- Constaté : le cas 8 n'apparaît dans aucune image (la vidéo passe du cas 7 au cas 9) ; la cadence est trop rapide pour tout lire.
Ce qui s'applique à Presti / à ce client :
- « Home Service Trades » (image 012) est le seul cas qui touche les métiers de Presti : appel ou message à toute heure, identification du service, test « urgence ? », confirmation, mise à jour du CRM. Chez Presti : la réponse écrite préparée (`lib/ai.ts`), l'urgence reconnue et escaladée à l'artisan (`lib/pilote/regles.ts:191`), le dossier dans le CRM de l'artisan (capacité `crm`). Exclus : l'appel par l'IA, le technicien dépêché seul, le créneau standard réservé seul et les « mises à jour d'arrivée » (aucun délai que l'artisan n'a pas validé).
- Chaque fiche commence par « Common problems » puis « AI Solution » (images 005 à 014) : c'est l'ordre de la fiche de découverte d'un client Entreprise (035-002, §5.2), ce qui coûte aujourd'hui d'abord, puis ce qu'on automatise ; à proposer à Benj comme trame de présentation de l'offre.
- Le flux « demander les documents, puis relancer les pièces manquantes » (images 009 et 010, « Collect onboarding docs », « Chase missing docs ») : une relance de pièce manquante (photo, plan) relève de `lib-relancer`, jamais deux relances en 3 jours (`lib/relancesRegistre.ts:18`).
- « Automotive » (images 013 et 014) : suivi de devis et rappel d'entretien, proches de `lib/relances.ts:37` (J+2, J+5, J+10) et de l'entretien proposé après chantier (L18). Les autres cas (e-commerce, cliniques, droit, finance) : sans objet.
Ce qui ne s'applique pas, et pourquoi :
- Les secteurs vus (e-commerce, cliniques, cabinets, finance, droit, automobile) ne sont pas les métiers de Presti ; seul « Home Service Trades » (image 012) s'en approche.
- Les noms de solutions (CCA, PRA, AA, DA) sont des étiquettes de l'auteur ; l'écran les développe en petites lettres sans autre explication, et « CCA » ne désigne pas le même agent d'un secteur à l'autre.
- Le rythme de la vidéo (neuf cas visibles en quatorze secondes) ne se prête pas à une étude détaillée.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 10 Industries = 10 Boring Automations » [images 001 à 004] : lu sur une maquette, non vérifié.
- Les numéros de cas « 1 » à « 7 », « 9 » et « 10 » à l'écran, et la mention « 24/7 » (image 012) : lus sur une maquette, non vérifié.

---

## 64. « How to Build a Claude AI Lead Generation System » (04/08/2026)

Source : « How to Build a Claude AI Lead Generation System », @restructureai, https://www.tiktok.com/@restructureai/video/7670177469919530247 · publiée le 04/08/2026 · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:09] Exemple fictif : l'équipe commerciale d'une entreprise solaire passe des heures à trouver un entrepôt et à préparer la prise de contact.
- [00:09]-[00:14] Problème du cas : après le premier contact, on découvre que le bâtiment est loué et que le locataire ne peut pas approuver une installation.
- [00:19]-[00:23] Module « Lead Discovery » : l'IA cherche sur Google Maps, dans les annuaires et sur les sites d'entreprises, puis filtre par lieu, taille, type de bien et potentiel d'achat.
- [00:28]-[00:39] Le « decision-maker profiler » identifie le propriétaire, le responsable des installations ou des opérations qui peut approuver le projet.
- [00:39]-[00:45] Le résultat : la bonne entreprise, la bonne personne et une raison réelle de contact ; l'auteur signale que ce n'est qu'une petite partie du système complet.
- Planche, images 021 à 036 : étape 1 « Lead Discovery » : règles de profil client idéal écrites par un humain, puis recherche et vérification, puis liste sans doublon (image 021) ; sources lues : Google Maps, annuaires, sites d'entreprise (image 026), avec une liste de résultats faite de cabinets dentaires et non d'installations solaires ; étape 2 « Decision Maker Profiler » : entreprise, personne trouvée, contact nommé (image 036).
- Planche, images 031 et 041 : un schéma complet avec un « directeur de recherche » et des index (entreprises, contacts, signaux) mis à jour par une tâche quotidienne, qui aboutit à une « liste d'appels du jour » (image 031) ; des fiches de contacts (propriétaire, directeur des installations, responsable des opérations) avec un pourcentage de confiance d'identité par fiche (image 041) : lu sur une maquette, non vérifié.
Principes et patterns réutilisables :
- Vérifier avant de contacter : le décideur doit pouvoir signer, sinon le contact est perdu [00:09]-[00:14].
- Un filtre explicite (lieu, taille, type de bien, potentiel) avant toute recherche approfondie [00:23].
- Trouver la personne qui décide, pas seulement l'entreprise [00:28]-[00:33].
Erreurs à éviter :
- Dit par l'auteur : le temps de recherche se compte en « heures », sans chiffre [00:05] ; aucune durée n'est donnée.
- Constaté : la vidéo n'a aucun chiffre sourcé ; le contrôle du décideur repose sur l'outil, sans méthode montrée.
- Constaté : la recherche automatisée sur Google Maps et les annuaires n'est pas encadrée à l'écran.
Ce qui s'applique à Presti / à ce client :
- « Human ICP rules » avant toute recherche (image 021) : c'est la grille d'ICP du réseau neuronal, qui fixe le tri de la chasse aux prospects de Presti (chantier 3) ; la liste sans doublon est `lib-dedoublonner` ; la « liste du jour » est un rapport du matin, pas un envoi.
- Les sources (Google Maps, annuaires, sites d'entreprise, image 026) : pour Presti, SearXNG, Firecrawl auto-hébergé, Crawlee et ScrapeGraphAI sur Oracle (`architecture-outils.md`), jamais Firecrawl en ligne, Apify ni LinkedIn. Chaque donnée sortie est une donnée de tiers : opt-out, exclusion et journalisation (`email-brevo.md`, ADR-005), aucune donnée de prospect vers un modèle gratuit en ligne (`securite.md`).
- « Ne peut pas approuver / loue le bâtiment » [00:09]-[00:14] (image 016) : vérifier avant d'écrire qu'on parle à la personne qui décide, c'est l'exclusion et la qualification par le code (`lib-qualifier-lead`) ; pour Presti, le dirigeant de l'artisan se trouve sur ses propres pages publiques, jamais par LinkedIn.
- Le pourcentage de confiance d'identité par contact (image 041) n'est repris que s'il est mesuré : un score sans mesure est un chiffre inventé.
- Toute prospection de Presti respecte le plafond de 300 e-mails par jour (`email-brevo.md`) et part sans validation de Benj (`autonomie-abonnements.md`).
Ce qui ne s'applique pas, et pourquoi :
- La prospection de bâtiments commerciaux (solaire, entrepôts) ne fait pas partie du métier de Presti.
- La recherche automatisée sur Google Maps et les annuaires d'entreprises touche à la collecte de données de tiers : elle ne doit pas être reprise sans cadrage (sécurité, règles de données).
- Le cas est un exemple fictif d'entreprise, pas un client de Presti.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « heures » de recherche [00:05] : sans chiffre, annoncé par l'auteur, non vérifié.
- Aucun autre chiffre n'est donné (annoncé par l'auteur, non vérifié : sans objet).

---

## 65. « I Built a Claude AI Marketing Department for a Contractors » (03/08/2026)

Source : « I Built a Claude AI Marketing Department for a Contractors », @restructureai, https://www.tiktok.com/@restructureai/video/7669813984941427989 · publiée le 03/08/2026 · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:04] L'auteur dit avoir été payé 20 000 dollars pour un service marketing IA pour un entrepreneur (annoncé par l'auteur, non vérifié) ; il donne le plan gratuitement.
- [00:04]-[00:09] Sept agents (annoncé par l'auteur, non vérifié) ; le problème identifié : pas un problème de marketing, mais des relances et un accueil mal organisés.
- [00:18]-[00:25] Module « Territory Intel » : lit le marché local (qui fait de la publicité dans le code postal, à quel prix, quels permis sont déposés).
- [00:28]-[00:39] Accueil : chaque demande (message, formulaire, appel manqué) reçoit une réponse en moins de cinq minutes ; type de travail, adresse, délai et budget sont relevés ; les demandes qualifiées vont au calendrier.
- [00:41]-[00:52] Économie du travail : quel message a amené l'appel, quel appel a donné un devis, quel devis est devenu un contrat signé, et ce que chacun a coûté.
- [00:55]-[01:03] Le centre d'opérations : Claude Code, présenté comme le directeur marketing qui ne prend ni pause ni congé.
- Planche, images 015 à 050 : sept modules (« Territory Intel » ; « The Proof Machine » où l'équipe envoie des photos de chantier, l'IA rédige le texte et « le propriétaire approuve » ; « Paid Local » ; « The Front Desk » qui répond en quelques minutes puis passe la main au propriétaire sur une question de prix ; « The Estimate Chase » qui relance un devis resté ouvert ; « The Review Engine » ; « Job Economics »), sous un « centre d'opérations » qui rend une page du matin (image 015).
- Planche, images 036 à 050 : une conversation de messagerie où l'IA répond à une demande de cuisine complète puis demande l'adresse pour vérifier la zone de l'équipe, avec une fiche vide (type de travail, adresse, délai, budget) qui se remplit (image 036) ; un tableau « économie du chantier » par canal (image 043) ; un tableau « post par post » reliant chaque publication aux appels et aux chantiers qu'elle a produits (image 050).
Principes et patterns réutilisables :
- Suivre l'argent jusqu'au contrat signé, et non les mentions « j'aime » ou la portée [00:41]-[00:46].
- Répondre à toute demande en moins de cinq minutes, même hors des heures [00:28]-[00:32].
- Qualifier avant de réserver : type, adresse, délai, budget [00:36]-[00:39].
Erreurs à éviter :
- Dit par l'auteur : « 20 000 dollars » reçus pour le service ; le montant n'est ni prouvé ni daté.
- Constaté : les écrans montrés (images 015 à 050) sont des maquettes sans chantier réel ; l'auteur ne dit pas combien de demandes arrivent par mois.
- Constaté : le « directeur marketing » confié à Claude Code ne décrit aucun rôle précis.
Ce qui s'applique à Presti / à ce client :
- « The Front Desk » (images 015 et 036) : réponse à toute demande en moins de cinq minutes [00:28]-[00:32] et qualification (type de travail, adresse, délai, budget) [00:36]-[00:39] : c'est la réponse préparée (`lib/ai.ts`) et la note-priorité calculée par le code (`lib-qualifier-lead`) ; en Studio elle attend le clic de l'artisan, en Signature elle part seule (`lib/plans.ts:11`). Le « owner takes over » sur une question de prix est la règle de Presti : jamais un prix estimé sans l'artisan. Les demandes qualifiées qui « vont au calendrier » (réservation seule) ne sont pas reprises.
- « The Estimate Chase » (image 015) : la relance d'un devis ouvert est la cadence J+2, J+5, J+10 (`lib/relances.ts:37`), jamais deux en 3 jours (`lib/relancesRegistre.ts:18`), arrêtée dès que le devis est accepté ; aucune relance n'invente d'urgence ni ne culpabilise (rang 10 du plan du chantier 4).
- « The Proof Machine » (photos de chantier, texte, « le propriétaire approuve ») : chantier 5 (contenus) à partir de vraies photos et de vrais chantiers, jamais inventés, avec la validation de l'artisan à chaque texte ; idée nouvelle : à proposer à Benj, dans n8n. Les réseaux de l'artisan ne sont pas gérés par Presti.
- Suivre l'argent jusqu'au contrat signé [00:41]-[00:46] et « post par post » (image 050) : `leads.origine` et l'entonnoir lien, demande, devis, facture ; le coût par publication suppose une publicité payante, hors Presti sans accord de Benj.
- « Claude Code, directeur marketing » [00:55]-[01:03] est refusé : Claude Code développe et vérifie, il ne tient aucun rôle auprès d'un client (`architecture-outils.md`).
Ce qui ne s'applique pas, et pourquoi :
- Le client est un entrepreneur fictif, pas un client de Presti : la vidéo ne le nomme pas.
- Le centre d'opérations confié à Claude Code comme « directeur marketing » ne correspond pas au rôle de Claude Code à Presti.
- Le suivi de l'argent par canal suppose une publicité payante que Presti ne gère pas pour ses artisans.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 20 000 dollars » [00:00] : annoncé par l'auteur, non vérifié.
- « sept agents » [00:04] : annoncé par l'auteur, non vérifié.
- « moins de cinq minutes » [00:32] : annoncé par l'auteur, non vérifié.

---

## 66. « I Built a Claude AI Marketing Department for a Law Firm » (31/07/2026)

Source : « I Built a Claude AI Marketing Department for a Law Firm », @restructureai, https://www.tiktok.com/@restructureai/video/7668702726770986261 · publiée le 31/07/2026 · lue le 03/11/2026 · intégralement : oui
Ce qu'elle montre :
- [00:00]-[00:05] L'auteur dit avoir construit pour un cabinet d'avocats un service marketing IA à 35 000 dollars (annoncé par l'auteur, non vérifié), et donne le plan gratuitement.
- [00:09]-[00:14] Sept modules annoncés (étude de marché, contenu, publicité, accueil, relances, avis, reporting) ; l'avocat reste dans la boucle et valide chaque mot publié.
- [00:19]-[00:27] Module 1, étude de marché : Claude lit le marché local comme un collaborateur lit un dossier (qui fait de la publicité dans le comté, sur quels mots, ce que les gens tapent tard la nuit).
- [00:27]-[00:41] Module 2, contenu : vidéos courtes qui répondent aux questions déjà posées, publications qui instaurent la confiance avant la consultation ; rien ne publie seul, tout attend dans une file de validation.
- [00:41]-[00:52] Module 3, publicité : Claude écrit les campagnes, les répartit par domaine de droit, et suit l'argent : quelle annonce a fait sonner le téléphone, quelle consultation est devenue un dossier signé.
- [00:55]-[01:04] Claude Code, présenté comme le directeur marketing, dépose chaque matin une page sur le bureau de l'associé-gérant.
- Planche, images 036 et 043 : un écran « Attorney Approval Queue » où un message rédigé part sur plusieurs plateformes une fois approuvé ; statuts « Published », « Pending review » et « Revise (Liability) » ; la mention « Human-in-the-loop gate : rien ne devient public sans la signature de l'avocat » (images 043 et 050).
- Planche, images 015 et 050 : module « Reviews » : après la clôture d'un dossier, une demande d'avis puis un routage selon la note (notes hautes poussées vers Google, notes basses vers une alerte) ; module « Ad Optimization » : lancer, suivre jusqu'au dossier signé, garder ou couper l'annonce ; l'écran de 2 h du matin liste des requêtes locales anonymisées (image 029).
Principes et patterns réutilisables :
- Une validation humaine avant toute publication : rien ne publie seul [00:37]-[00:41].
- Suivre l'argent jusqu'au dossier signé, pas l'impression [00:46]-[00:52].
- Un résumé quotidien court pour le dirigeant [01:00]-[01:04].
Erreurs à éviter :
- Dit par l'auteur : « 35 000 dollars » pour le service ; le montant n'est pas sourcé.
- Constaté : les écrans montrés (images 029 à 050) sont des maquettes sans résultat réel ; les modules sont illustrés, pas démontrés.
- Constaté : la vidéo ne dit pas comment l'avocat valide un texte qu'il ne relit pas.
Ce qui s'applique à Presti / à ce client :
- « Rien ne devient public sans la signature de l'avocat » (images 043 et 050) : ce sont les 2 ou 3 premiers contenus validés par Benj, puis la QA automatique qui remet un contenu en validation en cas d'anomalie (`autonomie-abonnements.md`) ; pour l'artisan, une publication qui parle d'un chantier attend son clic (Studio). Le statut « à réviser (responsabilité) » est un motif de refus affiché, comme le motif de la carte de lot (L16).
- Le routage des avis selon la note (image 015) n'est pas repris : n'envoyer vers Google que les clients satisfaits est un tri de la demande d'avis que Google interdit (à vérifier) ; Presti demande l'avis après chantier à tous, « quel qu'il soit » (`lib/apresChantier.ts:47-50`). Une alerte à l'artisan sur une note basse est reprise, pas le tri.
- Un résumé quotidien d'une page [01:00]-[01:04] : `presti-briefing-matin` (L15).
- Suivre l'argent jusqu'au dossier signé [00:46]-[00:52] (image 050) : `leads.origine` et l'entonnoir lien, demande, devis, facture ; garder ou couper une annonce suppose de la publicité payante, hors Presti sans accord de Benj.
- Les questions déjà posées [00:19]-[00:27] (image 029) : pour Presti, ce sont les questions qui reviennent dans les vraies demandes d'un artisan et nourrissent sa page `/site/[slug]` ; le compte vient de ses demandes, jamais d'un chiffre posé.
Ce qui ne s'applique pas, et pourquoi :
- Le client est un cabinet d'avocats : Presti n'a pas de clientèle juridique.
- La publicité par domaine de droit ne concerne pas les artisans de Presti.
- Le rôle confié à Claude Code (directeur marketing) ne correspond pas à son rôle à Presti.
Licence (dépôt) : sans objet (vidéo)
Chiffres annoncés :
- « 35 000 dollars » [00:00] : annoncé par l'auteur, non vérifié.
- « sept modules » [00:09] : annoncé par l'auteur, non vérifié.
- « 2 h du matin » [00:24] : exemple narratif, annoncé par l'auteur, non vérifié.
