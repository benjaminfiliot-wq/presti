import '@/app/globals.css'
import Breadcrumb from '@/app/Breadcrumb'
import { TRAITEMENTS, SOUS_TRAITANTS } from '@/lib/legalArtisan'

export const metadata = {
  title: 'Conditions générales',
  // Sans cette ligne, la canonique du layout racine ('/') s'applique : la page se déclare
  // comme étant l'accueil, alors qu'elle figure au sitemap — donc jamais indexée.
  alternates: { canonical: '/cgu' },
}

const Back = () => <Breadcrumb label="Conditions générales" path="/cgu" />

export default function CGU() {
  return (
    <main className="legal-wrap">
      <Back />
      <h1>Conditions Générales d’Utilisation et de Vente</h1>
      {/* Cette date FAIT la version des CGU acceptée à l'inscription : app/signup/page.tsx la recopie
          dans CGU_VERSION et l'écrit dans les métadonnées du compte. Si les deux divergent, on ne
          sait plus quel texte un abonné a accepté — la preuve du consentement tombe. Toute
          modification de fond ici doit donc être suivie de la même date dans app/signup/page.tsx. */}
      <div className="legal-updated">Dernière mise à jour : 5 septembre 2026</div>

      <p>Les présentes conditions (les « Conditions ») régissent l’accès et l’utilisation du service <strong>Presti</strong>, édité par Benjamin Filiot (voir <a href="/mentions-legales">Mentions légales</a>). En créant un compte, vous acceptez ces Conditions.</p>

      <h2>1. Objet du service</h2>
      <p>Presti est un outil en ligne d’assistance pour artisans permettant, notamment, de répondre aux demandes de devis, de générer des devis et factures, et de gérer son activité. Presti fournit une <strong>assistance</strong> : les contenus proposés (réponses, devis, factures) sont des propositions que l’utilisateur doit vérifier et valider.</p>

      <h2>2. Compte</h2>
      <p>L’utilisateur s’engage à fournir des informations exactes et à préserver la confidentialité de ses identifiants. Il est responsable de toute activité réalisée depuis son compte.</p>

      <h2>3. Abonnements, crédits et paiement</h2>
      <ul>
        <li>Le service s’adresse aux <strong>professionnels</strong> (artisans, entreprises du bâtiment et des services) agissant dans le cadre de leur activité. Il n’est pas destiné aux consommateurs.</li>
        <li>Presti propose une offre d’essai gratuite (limitée) et des abonnements payants fonctionnant à base de <strong>crédits</strong>. Les prix affichés sur la page <a href="/abonnement">Abonnement</a> sont exprimés en euros ; <strong>TVA non applicable, art. 293 B du CGI</strong> (franchise en base) : le montant affiché est le montant payé. Si Presti devient assujetti, les prix et la mention seront mis à jour avant tout prélèvement au nouveau régime.</li>
        <li>Les paiements sont traités par <strong>Stripe</strong>. Les abonnements sont sans engagement et résiliables à tout moment ; l’accès reste actif jusqu’à la fin de la période payée.</li>
        <li>Les crédits inclus dans un abonnement sont valables pour la période concernée et ne sont pas reportables sauf mention contraire.</li>
        <li>Sauf disposition légale impérative, les sommes versées ne sont pas remboursables une fois le service consommé.</li>
      </ul>

      {/* L'offre Signature vend un « support prioritaire » (lib/plans.ts, ligne de la grille
          publique) sans qu'aucun engagement n'ait jamais été écrit : l'audit final (B) l'a relevé
          comme une promesse de vente invérifiable — donc, entre professionnels, un argument
          commercial attaquable (art. L. 121-2 c. conso via L. 121-5). On écrit ici le minimum
          tenable par UNE personne : un délai de PREMIÈRE réponse, pas de résolution ; des jours
          ouvrés, pas du 24/7 ; une réparation bornée au prorata du mois, pas un dédommagement
          ouvert. Le délai de l'Essai/Essentiel reste plus long que la promesse « en général sous
          24 h » du formulaire de contact : cette dernière décrit l'usage constaté, celui-ci est
          l'engagement — l'engagement ne doit jamais être plus court que ce qu'on peut tenir un
          jour de chantier. */}
      <h2 id="support">4. Support et assistance</h2>
      <p>Le support se fait <strong>par écrit et en français</strong>, par <a href="/contact">le formulaire de contact</a> ou à l’adresse email des <a href="/mentions-legales">mentions légales</a> : les deux arrivent au même endroit.</p>
      <ul>
        <li><strong>Délai de première réponse</strong>, décompté en <strong>jours ouvrés</strong> (du lundi au vendredi, hors jours fériés français, heure de Paris) : <strong>Essai et Essentiel — 3 jours ouvrés</strong> ; <strong>Studio — 2 jours ouvrés</strong> ; <strong>Signature — 1 jour ouvré</strong>. Un message reçu après 18 h, un samedi, un dimanche ou un jour férié est décompté à partir du jour ouvré suivant.</li>
        <li><strong>Ce que « support prioritaire » veut dire</strong> (offre <a href="/abonnement">Signature</a>) : le délai d’un jour ouvré ci-dessus, et le passage en tête de file quand plusieurs demandes attendent. Rien d’autre : pas de ligne téléphonique dédiée, pas d’astreinte de nuit, de week-end ou de jour férié, pas d’interlocuteur attitré.</li>
        <li><strong>Première réponse, pas résolution</strong> : le délai porte sur une réponse humaine qui prend la demande en charge. Le temps de correction dépend de la nature du problème et parfois d’un prestataire tiers (hébergement, paiement, IA, email) sur lequel l’éditeur n’a pas la main.</li>
        <li><strong>Sécurité</strong> : une faille ou une violation de données se signale par les mêmes canaux et passe avant tout le reste, quelle que soit l’offre.</li>
        <li><strong>Si le délai n’est pas tenu</strong> : signalez-le par écrit, la demande passe en tête de file. Les abonnements sont sans engagement (article 9) : vous pouvez résilier à tout moment, sans frais. Aucune autre réparation n’est due au titre du délai de réponse.</li>
        <li><strong>Ce que le support ne couvre pas</strong> : le conseil juridique, comptable ou fiscal, et la rédaction de vos documents à votre place. Ces contenus restent sous votre responsabilité (article 6).</li>
      </ul>
      <div className="legal-note">
        Aucun taux de disponibilité n’est garanti : le service peut être interrompu pour maintenance ou du fait d’un prestataire. Presti est édité par une seule personne — les engagements ci-dessus sont ceux qu’elle peut tenir, et rien de plus.
      </div>

      <h2>5. Obligations de l’utilisateur</h2>
      <ul>
        <li>Utiliser le service conformément à la loi et aux présentes Conditions.</li>
        <li><strong>Vérifier, corriger et valider</strong> tout contenu généré avant de l’envoyer à un client ou de l’utiliser à des fins officielles (devis, facture, réponse).</li>
        <li>S’assurer de la conformité de ses documents à la réglementation applicable à son activité (mentions obligatoires, TVA, assurance, etc.).</li>
        <li>Ne pas détourner le service, ni porter atteinte à sa sécurité.</li>
      </ul>

      <h2 id="responsabilite">6. Limitation de responsabilité</h2>
      <div className="legal-note">
        Presti est un <strong>outil d’aide à la rédaction et à la gestion</strong>, s’appuyant notamment sur l’intelligence artificielle. Les contenus générés peuvent comporter des inexactitudes.
      </div>
      <ul>
        <li>Presti ne garantit pas l’exactitude, l’exhaustivité ou la conformité légale des contenus générés (devis, factures, réponses). <strong>L’utilisateur en demeure seul responsable</strong> et doit les vérifier avant usage.</li>
        <li>Presti ne saurait être tenu responsable des décisions prises, des documents envoyés, ni des conséquences (commerciales, fiscales, juridiques) résultant de l’usage du service.</li>
        <li>La responsabilité de l’éditeur, à supposer qu’elle soit engagée, est limitée au montant effectivement payé par l’utilisateur au titre des douze (12) derniers mois.</li>
        <li>Presti n’est pas responsable des interruptions liées à ses prestataires (hébergement, paiement, IA, email) ou à des cas de force majeure.</li>
      </ul>

      <h2>7. Propriété intellectuelle</h2>
      <p>La marque, l’interface et le code de Presti restent la propriété de l’éditeur. Les contenus que vous saisissez et les documents que vous générez vous appartiennent ; vous accordez à Presti une licence limitée nécessaire à la fourniture du service.</p>

      <h2>8. Données personnelles</h2>
      <p>Le traitement des données est décrit dans la <a href="/confidentialite">Politique de confidentialité</a>.</p>

      <h2>9. Résiliation</h2>
      <p>Vous pouvez cesser d’utiliser le service et supprimer votre compte à tout moment. L’éditeur peut suspendre un compte en cas de manquement grave aux présentes Conditions.</p>

      <h2>10. Modification des Conditions</h2>
      <p>L’éditeur peut faire évoluer ces Conditions. Les utilisateurs sont informés des modifications substantielles ; la poursuite de l’utilisation vaut acceptation.</p>

      {/* Beaucoup de conditions générales recopient encore un lien vers la plateforme européenne
          de règlement en ligne des litiges : elle a fermé le 20 juillet 2025. Renvoyer un client
          vers une adresse morte, c'est le défaut que l'audit reproche déjà à contact@prestiapp.fr,
          en version juridique. On dit donc pourquoi il n'y a pas de lien, plutôt que d'en mettre un.
          Et on ne nomme AUCUN médiateur de la consommation : Presti n'a adhéré à aucun (le service
          est vendu à des professionnels), et afficher un nom sans adhésion serait la même faute que
          celle qu'on interdit aux artisans dans lib/legalArtisan.ts — inventer une mention. */}
      <h2 id="litiges">11. Droit applicable et règlement des litiges</h2>
      <p>Les présentes Conditions sont soumises au <strong>droit français</strong>. En cas de difficulté, écrivez-nous d’abord : une solution amiable est recherchée en priorité, dans les délais de réponse de l’article 4.</p>
      <ul>
        <li><strong>Médiation de la consommation</strong> : Presti contracte avec des <strong>professionnels</strong> agissant dans le cadre de leur activité (article 3). Le dispositif de médiation de la consommation (art. L. 611-1 et suivants du code de la consommation) ne s’applique donc pas à ce contrat, et aucun médiateur n’y est désigné — plutôt que d’en afficher un auquel l’éditeur n’a pas adhéré.</li>
        <li><strong>Si vous avez souscrit en dehors de toute activité professionnelle</strong>, vous conservez le bénéfice des règles impératives du code de la consommation. Signalez-le dès votre réclamation : le service n’étant pas destiné aux consommateurs, la situation est traitée au cas par cas, et à défaut de solution amiable les sommes versées vous sont intégralement remboursées.</li>
        <li><strong>Règlement en ligne des litiges</strong> : aucun lien n’est donné vers la plateforme européenne de règlement en ligne des litiges. Elle a <strong>cessé de fonctionner le 20 juillet 2025</strong> (règlement (UE) 2024/3228, qui abroge le règlement (UE) n° 524/2013).</li>
        <li><strong>Vos clients à vous</strong> : si vous intervenez chez des particuliers, c’est <em>vous</em> qui devez adhérer à un médiateur de la consommation et l’indiquer (art. L. 616-1 du code de la consommation). Renseignez-le dans <strong>Paramètres → Entreprise &amp; légal</strong> : Presti le reprend alors sur vos devis, vos factures, vos mentions légales et la page « Informations légales » de votre site. Tant qu’il manque, la mention est signalée comme manquante — Presti n’en invente aucun.</li>
        <li><strong>Compétence</strong> : à défaut d’accord amiable, les tribunaux français sont compétents, sous réserve des règles protectrices applicables aux consommateurs.</li>
      </ul>

      <h2>12. Contact</h2>
      <p>Pour toute question sur ces Conditions ou sur le service : <a href="/contact">le formulaire de contact</a>, ou l’adresse email publiée dans les <a href="/mentions-legales">mentions légales</a> — qui portent aussi les coordonnées complètes de l’éditeur. Les délais de réponse sont ceux de l’<a href="#support">article 4</a>.</p>

      <h2 id="sous-traitance">13. Annexe — Traitement des données pour le compte de l’artisan (art. 28 RGPD)</h2>
      <p>Quand vous utilisez Presti pour recevoir des demandes, converser avec vos clients, établir des devis et des factures, <strong>vous êtes responsable du traitement</strong> des données de vos clients et prospects, et <strong>Presti est votre sous-traitant</strong>. La présente annexe est le contrat écrit qu’exige l’article 28.3 du RGPD ; elle fait partie des Conditions que vous acceptez à l’inscription.</p>
      <h3>Objet, durée, nature et finalités</h3>
      <ul>
        {TRAITEMENTS.map((t) => (
          <li key={t.finalite}><strong>{t.finalite}</strong> — données : {t.donnees.toLowerCase()} ; durée : {t.duree}.</li>
        ))}
      </ul>
      <p>Le traitement dure le temps de votre compte, puis le temps de la suppression ou de l’anonymisation décrite ci-dessous. Personnes concernées : vos clients et prospects. Nature : hébergement, rédaction assistée des réponses, génération de documents, envoi d’emails, relève de votre messagerie si vous l’avez reliée.</p>

      {/* Art. 28.3 exige que le contrat dise OÙ, COMBIEN DE TEMPS, avec QUELLES mesures, et ce que
          deviennent les données à la fin. Les trois premiers points étaient implicites ou éparpillés
          (politique de confidentialité, liste des sous-traitants) : un responsable de traitement à
          qui la CNIL demande son contrat de sous-traitance ne peut pas répondre « c'est ailleurs sur
          le site ». */}
      <h3>Lieu du traitement et transferts</h3>
      <p>Les données de vos clients sont <strong>stockées dans l’Union européenne</strong> : base de données et photos chez Supabase, région de Francfort. L’hébergement applicatif, le modèle d’intelligence artificielle et l’envoi des emails sont opérés depuis les <strong>États-Unis</strong> ; ces transferts sont encadrés par les <strong>clauses contractuelles types</strong> de la Commission européenne (décision d’exécution (UE) 2021/914). Le lieu de chaque prestataire est rappelé dans la liste ci-dessous. Aucun transfert vers un autre pays n’a lieu sans mise à jour de la présente annexe et information préalable.</p>

      <h3>Durées de conservation</h3>
      <ul>
        <li>Les durées propres à chaque finalité figurent dans la liste ci-dessus ; elles courent tant que votre compte existe.</li>
        <li>Quand vous demandez la suppression du compte, un <strong>délai de grâce de 30 jours</strong> s’ouvre — vous pouvez revenir en arrière et exporter — puis la purge est automatique.</li>
        <li>Les pièces comptables (devis acceptés, factures) sont conservées <strong>10 ans</strong> (art. L. 102 B du livre des procédures fiscales), débarrassées des coordonnées qui ne sont pas nécessaires à leur valeur probante.</li>
        <li>Les traces techniques de protection contre les abus (empreinte pseudonymisée de l’adresse IP, horodatages) : <strong>12 mois</strong>.</li>
      </ul>

      <h3>Engagements de Presti</h3>
      <ul>
        <li><strong>Instructions</strong> : Presti ne traite ces données que sur vos instructions documentées — celles que vous donnez en configurant votre plateforme (mode de réponse, règles d’automatisation, canaux reliés) — et pour aucune autre finalité. Si une instruction nous paraît contraire au RGPD, nous vous en informons.</li>
        <li><strong>Confidentialité</strong> : les personnes autorisées à accéder aux données sont tenues à la confidentialité. Presti n’accède aux conversations de vos clients que pour le support, à votre demande, ou pour la sécurité du service.</li>
        {/* Cette liste ne cite QUE des mesures qui existent et se vérifient dans le dépôt (RLS,
            lib/motDePasse.ts, double authentification, chiffrement des canaux, ipPseudonyme,
            plafonds d'envoi). La version précédente annonçait « journal des accès, sauvegardes » :
            il n'existe aucune table de journal d'accès, et l'audit final (F-12) a établi qu'aucune
            sauvegarde n'est prouvée. Annoncer une mesure de sécurité qu'on n'a pas, c'est ce qui
            transforme un incident en manquement à l'art. 32 — on ne les remet qu'une fois faites. */}
        <li><strong>Sécurité</strong> (art. 32) : connexions chiffrées (HTTPS/TLS), <strong>cloisonnement par compte appliqué par la base elle-même</strong> (politiques de sécurité au niveau des lignes), mots de passe hachés et refusés s’ils figurent dans une fuite connue, double authentification disponible sur votre compte, identifiants de messagerie chiffrés et jamais réaffichés, secrets conservés côté serveur uniquement, adresses IP pseudonymisées avant tout enregistrement, bornes anti-abus (plafonds d’envoi, bannissement des sources abusives), journalisation des erreurs et des évènements de la plateforme. La disponibilité de vos données ne dépend pas de nous seuls : l’export complet est à votre main à tout moment, depuis <strong>Paramètres → Données &amp; confidentialité</strong>.</li>
        <li><strong>Sous-traitants ultérieurs</strong> : vous autorisez le recours aux prestataires suivants, chacun encadré par un contrat imposant les mêmes obligations. Aucun d’eux n’est autorisé à utiliser vos données pour son propre compte, ni à s’en servir pour entraîner ses modèles. Tout changement vous est notifié par email au moins 30 jours avant ; vous pouvez alors vous y opposer en résiliant.
          <ul>{SOUS_TRAITANTS.filter((s) => s.nom !== 'Presti').map((s) => <li key={s.nom}><strong>{s.nom}</strong> — {s.role} — {s.lieu}</li>)}</ul>
        </li>
        <li><strong>Assistance</strong> : Presti vous aide à répondre aux demandes d’exercice de droits de vos clients (accès, rectification, effacement, portabilité) — vous disposez pour cela de la suppression par brique et de l’export depuis Paramètres → Données &amp; confidentialité — et à respecter vos obligations de sécurité, d’analyse d’impact et de consultation de l’autorité, dans la mesure du possible.</li>
        <li><strong>Violation de données</strong> : Presti vous notifie toute violation affectant ces données sans retard injustifié après en avoir eu connaissance, avec les éléments utiles à votre propre notification à la CNIL.</li>
        <li><strong>Sort des données à la fin du contrat</strong> : à la résiliation ou à la suppression du compte, le choix vous appartient. <em>Restitution</em> : l’export complet (archive téléchargeable, formats ouverts) est à votre main pendant tout le délai de grâce de 30 jours, depuis Paramètres → Données &amp; confidentialité. <em>Suppression</em> : elle est automatique au terme de ces 30 jours, ou immédiate sur votre demande écrite. Presti efface alors les données de vos clients de ses systèmes actifs et demande la même chose à ses sous-traitants ultérieurs. Ne subsistent que les pièces comptables que la loi impose de conserver dix ans — anonymisées de ce qui n’y est pas nécessaire — et les traces techniques anti-abus, jusqu’à 12 mois. Aucune copie n’est conservée à une autre fin ; la suppression vous est confirmée par écrit si vous le demandez.</li>
        <li><strong>Information et audit</strong> : Presti met à votre disposition les informations nécessaires pour démontrer le respect de ces obligations (cette annexe, la politique de confidentialité, la liste des sous-traitants) et se prête à un audit raisonnable que vous mandateriez, à vos frais, avec un préavis de 30 jours.</li>
      </ul>
      <p>Presti tient un registre des catégories d’activités de traitement effectuées pour votre compte (art. 30.2). Cette annexe vous est aussi présentée, sous une forme adaptée à vos clients, sur la page « Informations légales » de votre site et de votre plateforme.</p>

      <p style={{ marginTop: '2.4rem' }}><a href="/confidentialite">Politique de confidentialité</a> · <a href="/mentions-legales">Mentions légales</a></p>
    </main>
  )
}
