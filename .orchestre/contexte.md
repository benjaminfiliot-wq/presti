# Carte du code — presti (2026-09-15T11:10:10Z)

> Générée par `node scripts/orchestre.mjs contexte` depuis le code, jamais à la main. Une page : ce que le code FAIT.
> Pourquoi on l’a décidé vit dans le vault (`../SaaS` : `CLAUDE.md`, `Decisions/`, `Récap-Projet.md`). Où en est le chantier : `.orchestre/digest.md`.

SaaS pour les artisans du bâtiment : plateforme de conversation, devis, factures, site à la demande Pile : Next.js + Supabase + Vercel.

## Pages (34) — `app/**/page.tsx`
- `/abonnement` : ·
- `/aide` : ·
- `/cgu` : ·
- `/confidentialite` : ·
- `/contact` : ·
- `/controle` : ·
- `/dashboard` : ·
- `/devis` : [id], ·
- `/direction` : ·
- `/factures` : ·
- `/faq` : ·
- `/inventaire` : fournisseurs, ·, recherche
- `/login` : ·
- `/mentions-legales` : ·
- `/messages` : canaux, ·
- `/onboarding` : ·
- `/outils` : ·
- `/p` : [slug]/[...reste], [slug]
- `/` : ·
- `/parametres` : ·
- `/plateforme` : ·
- `/profil` : ·
- `/reset-password` : ·
- `/signup` : ·
- `/site` : [slug]/[...reste], [slug]/infos-legales, [slug], commander
- `/tarifs` : ·

## API (94) — `app/api/**/route.ts`, préfixe `/api`
- `/account` : delete [GET POST DELETE], inscription [POST], slug [GET POST]
- `/audience` : · [POST]
- `/auth` : code [POST GET], code/verifier [POST], mdp-fuite [POST], reset-confirm [POST], reset-request [POST]
- `/canaux` : relever [GET POST], · [GET POST DELETE]
- `/contact` : · [POST]
- `/controle` : a-faire [GET], alertes/[id]/acquitter [POST], apports/[id]/statut [POST], apports [GET POST PATCH], audience [GET], barre [GET], cerveaux [GET], chiffres [GET], clients/[id]/action [POST], clients/[id] [GET], clients [GET], compta [GET POST], courriers/[fil]/action [POST], courriers/[fil] [GET], courriers/relever [POST], courriers [GET], crons/[nom]/relancer [POST], etat [GET], fil [GET], journal [GET], recherche [GET], reconfirmer [POST], reglages [GET POST], releve [GET POST], securite/bans [GET POST DELETE], sites/[id] [POST], sites [GET], support/demander [POST], support/lire [GET], support [GET POST]
- `/conversation` : devis [POST], regles [POST], · [GET POST], stream [POST]
- `/cron` : alertes [GET], purge-comptes [GET], relances [GET]
- `/devis` : [id]/envoyer [POST], [id]/pdf [GET], [id] [POST DELETE], auto [POST], generer [POST], · [POST]
- `/domain` : · [GET POST DELETE]
- `/donnees` : export [GET], · [GET POST]
- `/factures` : [id]/avoir [POST], [id]/facturx [GET], [id]/pdf [GET], [id] [GET PATCH DELETE], · [POST]
- `/inventaire` : fournisseurs [GET POST DELETE], materiaux [GET POST DELETE], observations [GET POST], recherche/retenir [POST], recherche [POST], · [GET POST DELETE]
- `/leads` : contact [POST], photos [POST], · [POST]
- `/media` : · [POST GET]
- `/messages` : · [POST]
- `/p` : auth [GET POST]
- `/plat-event` : · [POST]
- `/plateforme` : apparence [GET POST], config [GET]
- `/push` : abonner [GET POST DELETE], test [POST]
- `/report-error` : · [POST]
- `/securite` : acces-support [GET POST], appareils [GET DELETE], mot-de-passe [POST], sessions [GET DELETE POST]
- `/site` : commander/brouillon [GET PUT], commander [POST], generate [POST]
- `/stripe` : portail [GET POST], webhook [POST]
- `/subscribe` : · [POST]
- `/support` : demande [POST]
- `/tarifs` : · [GET POST DELETE]
- `/tools` : reponse [POST]

## Drapeaux — `lib/flags.ts` (23) : une fonctionnalité non finie n'apparaît pas
codeEmail=true · pushWeb=true · pushNatif=true · mfa=true · direction=true · apports=true · actionsArtisan=true · messagerie=true · comptabilite=true · supportArtisan=true · inventaireOcr=false · inventaireRecherche=true · plateformeRegles=true · aideVisites=true · aideCentre=true · landingVideo=true · plateformePersona=true · canauxWhatsapp=false · canauxReseaux=false · siteCommande=true · siteCommandeVente=false · landingDemoSite=true · audience=true

## Formules — `lib/plans.ts`
- plans : gratuit (Essai, 0 €/mois, BASE) · essentiel (Essentiel, 29 €/mois, BASE) · studio (Studio, 59 €/mois, STUDIO) · signature (Signature, 99 €/mois, SIGNATURE) · business (Business, 0 €/mois, SIGNATURE)
- grille complète (16 lignes) : Page de conversation à votre marque · Assistant IA · Comptes clients (lien magique, historique) · Personnalisation · Votre nom de domaine sur la page de conversation · Devis chiffrés par l’IA, sur vos prix · Factures + facture électronique · Relances automatiques · Stock par lieu, scan, seuils · Recherche IA chez vos fournisseurs · Votre boîte email branchée · WhatsApp · Réseaux sociaux · Crédits chaque mois · Export de vos données · Support prioritaire

## Bibliothèque — `lib/**/*.ts` (100 fichiers, exports nommés)
- `lib/abonnementSync.ts` (3) : planDepuisMontant, Alignement, alignerSurAbonnement
- `lib/ai.ts` (23) : genParams, Artisan, Lead, LeadInsights, analyzeLead, qualifyLead, blocProspect, generateLeadReply, …
- `lib/ai/antiFabrication.ts` (12) : ProfilCapacites, CapaciteDetectee, normaliser, texteProfil, MOTIFS_CAPACITE, RE_NEGATION, phrases, detecterCapacitesNonDeclarees, …
- `lib/ai/exemples.ts` (6) : ExempleDevis, ExemplesArtisan, EXEMPLES_VIDES, PLAFOND_EXEMPLES, chargerExemples, blocExemples
- `lib/ai/metiers.ts` (9) : MetierId, ProfilMetier, PROFILS_METIER, PROFIL_GENERIQUE, detecterMetier, profilMetier, regleTva, blocMetierReponse, …
- `lib/ai/outils.ts` (10) : MAX_TOURS_OUTILS, TIMEOUT_OUTILS_MS, ActionOutil, ArtisanOutils, ConversationOutils, ResultatOutils, Executeurs, executeursSupabase, …
- `lib/ai/playbooks.ts` (8) : Intention, Playbook, MAX_QUESTIONS, PLAYBOOKS, playbookPour, compterQuestions, questionsDejaPosees, blocPlaybook
- `lib/ai/routage.ts` (5) : SignauxComplexite, RaisonRoutage, Routage, estComplexe, routerModele
- `lib/aide.ts` (5) : Article, InfoBulle, ARTICLES, INFOBULLES, chercher
- `lib/alerteService.ts` (4) : MotifPanne, motifDe, estPanneDeCompte, signalerPanneIA
- `lib/alertes.ts` (11) : Motif, Alerte, coutIADuMois, estimationDepuisLesCredits, CRONS_ATTENDUS, enregistrerErreur, enregistrerPassage, alertePaiement, …
- `lib/apports.ts` (7) : COOKIE_APPORT, JOURS_APPORT, CODE, valeurCookie, enteteCookieApport, lireApport, preuveDepuisCookie
- `lib/audience.ts` (23) : PAGES_MESUREES, CHEMINS_DISCRETS, HOTES_MESURES, MOIS_AUDIENCE, CLE_NE_PAS_COMPTER, CAMPAGNES, cheminMesurable, hoteMesure, …
- `lib/audienceServeur.ts` (7) : jourParis, minuitParis, reseauIp, empreinteDuJour, PLAFOND_JOUR_AUDIENCE, cleJourAudience, clePlafond
- `lib/authArtisan.ts` (9) : Session, EchecAuth, ERREUR_MFA, ERREUR_SUSPENDU, ERREUR_CODE, authArtisan, revoquerSessions, estEchec, …
- `lib/canaux.ts` (5) : devineFournisseur, ENTREPRISE_MAIL, boiteEntrepriseResolue, canalEntreprise, testerImap
- `lib/clientAuth.ts` (7) : COOKIE_SESSION, ClientSession, creerLienMagique, consommerLien, sessionCourante, revoquerSession, cookieOptions
- `lib/connexion.ts` (23) : COOKIE_APPAREIL, JOURS_APPAREIL, MINUTES_CODE, ESSAIS_CODE, ERREUR_IDENTIFIANTS, clientPublic, hacherCode, genererCode, …
- `lib/contrast.ts` (5) : luminance, contrastRatio, niveauWCAG, encreLisible, lisibleSur
- `lib/controle/confiance.ts` (6) : Sens, Signal, Confiance, verdictLisible, peser, peserEtEnregistrer
- `lib/controle/droits.ts` (7) : RoleInterne, Verbe, Domaine, Verdict, peutFaire, autorise, borneAuxSiennes
- `lib/controle/releve.ts` (6) : TAUX, LigneClient, Releve, calculerReleve, bornesDuMois, enEuros
- `lib/controle/sante.ts` (3) : Niveau, Controle, niveauService
- `lib/credits.ts` (2) : consumeCredit, rendreCredit
- `lib/devisAuto.ts` (3) : SourceDevis, ResultatDevisAuto, creerDevisBrouillonPourLead
- `lib/devisPdfData.ts` (3) : mentionsReglement, MENTION_TVA_DEBITS, buildPdfData
- `lib/devisTotals.ts` (2) : LigneCalc, computeTotals
- `lib/direction/apports.ts` (12) : Statut, LigneApport, AvecCanal, RAISON_CANAL, Verdict, TAUX_MIN, TAUX_PLEIN, TAUX_CONTESTE, …
- `lib/direction/canaux.ts` (4) : Apporteur, lireApporteurs, estCanal, canalParCode
- `lib/direction/courriers.ts` (6) : Identifiants, boiteEntreprise, Releve, relever, correspondantLisible, sujetReponse
- `lib/direction/fraicheur.ts` (7) : Source, Sourcee, sourcer, nonMesure, relTime, euros, oublier
- `lib/direction/garde.ts` (9) : Role, Fondateur, Refus, estFondateur, exigerDomaine, domaineRefuse, estDirection, estRefus, …
- `lib/direction/journal.ts` (5) : Action, Entree, epurer, journaliser, refusJournal
- `lib/direction/natures.ts` (8) : NATURES, Nature, Urgence, CLES_NATURE, estNature, libelleNature, GROUPES, raisonDuMotif
- `lib/direction/perimetre.ts` (3) : MOTIF_TEST, seulsLesVrais, compteDansLesChiffres
- `lib/direction/reconfirmation.ts` (8) : Portee, PORTEES, DUREE_S, EN_TETE, emettre, Verdict, consommer, exigerReconfirmation
- `lib/direction/stripe-actions.ts` (9) : OPTIONS, Resultat, changerOffre, prixOffre, rembourser, mettreEnPause, reprendre, pauseLisible, …
- `lib/direction/stripe.ts` (10) : joignable, Mrr, mrr, Encaisse, encaisseDuMois, conversionsDuJour, Echec, echecsRecents, …
- `lib/email.ts` (3) : EMAIL_ENTREPRISE, sendEmail, notifierEntreprise
- `lib/facturation.ts` (15) : DATE_CIBS, FIN_TOLERANCE_CGI, BaseMention, mentionFranchise, toleranceCgiEncoreValable, sirenValide, formaterSiren, CategorieOperation, …
- `lib/factureDepuisDevis.ts` (3) : LigneIn, ResultatFacture, creerFacture
- `lib/facturx.ts` (4) : LigneFacture, DonneesFacturX, genererFacturX, controlerAvantEmission
- `lib/flags.ts` (3) : FLAGS, Flag, actif
- `lib/imageQualite.ts` (6) : Role, Gravite, Alerte, Analyse, analyserImage, CONSEILS_PHOTO
- `lib/installation.ts` (4) : peutInstaller, surChangement, installer, estInstallee
- `lib/inventaire/auth.ts` (3) : AuthInventaire, authInventaire, estRefus
- `lib/inventaire/cachePrix.ts` (13) : HEURES_VALIDITE, VERSION_CACHE, DOMAINES_PARTAGEABLES, domainePartageable, normaliserRequete, LONGUEUR_MAX_PARTAGE, MOTS_MAX_PARTAGE, clePartageable, …
- `lib/inventaire/liste-depart.ts` (4) : NOTE_ACCES_CONNEXION, FournisseurDepart, LISTE_DEPART, domaineDe
- `lib/inventaire/observations.ts` (4) : ObservationEntree, nettoyerObservation, enregistrerObservation, listerObservations
- `lib/inventaire/types.ts` (15) : SourceObservation, TypeFournisseur, TYPES_FOURNISSEUR, SOURCES_OBSERVATION, JOURS_REVERIFICATION, ageLisible, aReverifier, Fournisseur, …
- `lib/legalArtisan.ts` (16) : ArtisanLegal, Mention, mentionsObligatoires, mentionsManquantes, MENTIONS_EMISSION, OU_REMPLIR, mentionsManquantesEmission, messageMentionsBloquantes, …
- `lib/lignes.ts` (2) : LigneNorm, normalizeLigne
- `lib/limites.ts` (3) : consommerLimite, cleEmail, limiteAtteinte
- `lib/mailLite.ts` (3) : MailLu, sansCitation, lireMail
- `lib/media.ts` (7) : MEDIA_BUCKET, resizeToBlob, blobToDataUrl, compressPhotoToDataUrl, uploadArtisanMedia, PhotoPreparee, preparerPhoto
- `lib/models.ts` (4) : Tier, TIERS, tierAllowed, resolveModel
- `lib/motDePasse.ts` (7) : Force, evaluerMotDePasse, messageAuth, Fuite, verifierFuite, recupererDepuisHibp, messageFuite
- `lib/natif.ts` (9) : estNatif, plateforme, plugin, partager, partagerFichier, prendrePhoto, scannerCodeBarres, vibrer, …
- `lib/notifications.ts` (2) : chargePush, notifierArtisan
- `lib/notificationsTypes.ts` (5) : TypeNotification, TYPES_NOTIFICATION, Notifications, notificationActive, pushActive
- `lib/plans.ts` (16) : PlanId, PlanPayant, Capacite, PLANS, CREDIT_COST, COUT_RECHERCHE, planConf, siteMaxForPlan, …
- `lib/platStats.ts` (1) : computeResponseDelay
- `lib/plateformeConfig.ts` (14) : ModeReponse, PlateformeConfig, CONFIG_DEFAUT, personaDe, getPlateformeConfig, motEscalade, heureFrance, dansLaPlage, …
- `lib/plateformeStyle.ts` (21) : Densite, Composeur, Schema, PlateformeStyle, STYLE_PLAT_DEFAUT, THEMES_PLAT, ACCENT_DEFAUT, ACCENT_VISIBILITE_MIN, …
- `lib/prix/artisan.ts` (1) : sourceArtisan
- `lib/prix/csv.ts` (4) : LigneTarif, Lecture, lirePrix, lireCsv
- `lib/prix/index.ts` (4) : Catalogue, catalogueDe, rechercherPrix, SOURCES_DISPONIBLES
- `lib/prix/marche.ts` (1) : sourceMarche
- `lib/prix/types.ts` (6) : SourceId, Poste, Fourchette, SourcePrix, libelleSource, sourceLigneValide
- `lib/purgeComptes.ts` (3) : JOURS_DE_GRACE, emailAnonyme, purgerComptes
- `lib/purgesRgpd.ts` (9) : PLAFOND_LIGNES, PLAFOND_CONVERSATIONS, JOURS_GRACE_JETONS, JOURS_SESSIONS_VERIFIEES, BilanPurges, seuilMois, seuilJours, purgerConversationsSansSuite, …
- `lib/push.ts` (10) : ChargePush, ResultatPush, PLAFOND_PUSH_HEURE, clePubliqueVapid, cheminSur, TAILLE_CHARGE, chargeUtile, SERVICES_PUSH, …
- `lib/pushClient.ts` (1) : desabonnerCetAppareil
- `lib/pushNatif.ts` (4) : ChargeNative, ResultatNatif, firebasePret, envoyerPushNatif
- `lib/quotaMedia.ts` (13) : PLAFOND_CONVERSATION, TAILLE_MAX_FICHIER, plafondImages, plafondPhotosClients, formaterOctets, messagePlafondImages, octetsImages, Verdict, …
- `lib/recherche-fournisseurs.ts` (15) : HtOuTtc, ResultatRecherche, NonVu, SortieRecherche, EntreeRecherche, MAX_RESULTATS, sceller, sceauValide, …
- `lib/regles.ts` (10) : Maillons, Prereglage, PREREGLAGES, MAILLONS_DEFAUT, normaliserMaillons, phraseRegle, ContexteConversation, Decision, …
- `lib/reglesServeur.ts` (3) : regleDe, declencherRegles, acompteApresAcceptation
- `lib/relances.ts` (2) : CADENCE_RELANCES, planifierRelances
- `lib/releveCanal.ts` (2) : Canal, releverCanal
- `lib/renderPdf.ts` (1) : renderPdfToBuffer
- `lib/secretBox.ts` (4) : chiffrementDisponible, chiffrer, dechiffrer, masque
- `lib/security.ts` (4) : getIp, isBanned, recordAbuse, ipPseudonyme
- `lib/siteCommande.ts` (22) : PRIX_SITE_CENTS, PRIX_SITE_TEXTE, DELAI_ANNONCE, SITE_A_LA_DEMANDE, ETATS, EtatCommande, TRANSITIONS, transitionValide, …
- `lib/siteCommandeServeur.ts` (6) : brouillonDe, commandesDe, enregistrerBrouillon, poserSessionStripe, Encaissement, encaisserCommandeSite
- `lib/siteLayout.ts` (9) : SectionId, SlidesOpts, slidesOpts, SiteSection, SiteLayout, SECTION_MIN_TIER, SECTION_ORDER, defaultLayout, …
- `lib/siteStyle.ts` (13) : CoupleId, Echelle, Bouton, Rythme, Texture, Motion, SiteStyle, STYLE_DEFAUT, …
- `lib/sitesGeneres.ts` (9) : BUCKET_SITES, PREFIXE_ROUTE, TYPES_MIME, typeMime, cheminObjet, FichierServi, lireFichier, siteDepose, …
- `lib/slug.ts` (3) : slugify, slugBase, randomSuffix
- `lib/slugRedirect.ts` (1) : artisanParAncienSlug
- `lib/stripe.ts` (2) : stripe, concerneAbonnementCourant
- `lib/suiviDemande.ts` (5) : ETAPES_DEMANDE, EtapeDemande, SuiviDemande, DonneesSuivi, suiviDemande
- `lib/supabaseAdmin.ts` (1) : supabaseAdmin
- `lib/supabaseClient.ts` (1) : supabase
- `lib/suspension.ts` (3) : SuspensionEnCours, suspensionEnCours, MESSAGE_PUBLIC_INDISPONIBLE
- `lib/themeFonds.ts` (2) : FOND_THEME, fondDuTheme
- `lib/urls.ts` (14) : ArtisanAdresse, BASE_PRESTI, DOMAINE_NEUTRE, SOUS_DOMAINES, SLUGS_RESERVES, ModeUrl, modeUrl, chemins, …
- `lib/userAgent.ts` (1) : lireUserAgent
- `lib/vercelDomains.ts` (6) : DnsRecord, DomainStatus, normalizeDomain, addDomain, getStatus, removeDomain
- `lib/zip.ts` (2) : crc32, ZipFlux

## Migrations — `supabase/migrations` (92)
- dernières : 0088_site_commande.sql, 0089_sites_bucket.sql, 0090_audience.sql, 0091_audience_correctifs.sql, 0092_audience_flux_nu.sql

## Scripts — `scripts/` (218 .mjs, dont 78 suites e2e)

## Orchestre — file : 0 · en cours : 1 · faites : 41 · refusées : 1

