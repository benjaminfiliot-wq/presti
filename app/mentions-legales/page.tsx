import '@/app/globals.css'
import Breadcrumb from '@/app/Breadcrumb'

export const metadata = {
  title: 'Mentions légales',
  // Sans cette ligne, la canonique du layout racine ('/') s'applique : la page se déclare
  // comme étant l'accueil, alors qu'elle figure au sitemap — donc jamais indexée.
  alternates: { canonical: '/mentions-legales' },
}

const Back = () => <Breadcrumb label="Mentions légales" path="/mentions-legales" />

export default function MentionsLegales() {
  return (
    <main className="legal-wrap">
      <Back />
      <h1>Mentions légales</h1>
      <div className="legal-updated">Dernière mise à jour : 5 septembre 2026</div>

      <h2>Éditeur du site</h2>
      <div className="legal-card">
        <div><span className="k">Service</span> Presti (prestiapp.fr)</div>
        <div><span className="k">Éditeur</span> Benjamin Filiot — entrepreneur individuel (micro-entreprise)</div>
        <div><span className="k">Adresse</span> 1 rue du Brouage, 17230 Marans, France</div>
        <div><span className="k">SIREN</span> 109 411 348 (RNE — immatriculée le 1er septembre 2026)</div>
        <div><span className="k">Code APE</span> 6201Z — Programmation informatique</div>
        <div><span className="k">TVA</span> non applicable, art. 293 B du CGI (franchise en base)</div>
        {/* LCEN art. 6-III-1 a et art. 19 : pour une personne physique qui édite un service en ligne
            et vend à distance, un formulaire ne vaut PAS « une adresse de courrier électronique ».
            L'audit final (B, D2) l'a compté comme défaut majeur : la page n'en portait aucune.
            L'adresse est écrite en clair ici, et NON lue d'une variable d'environnement : si la
            variable manquait à un déploiement, lib/email.ts se rabat sur contact@prestiapp.fr —
            une boîte qui n'existe pas. Une mention légale ne doit pas pouvoir devenir fausse toute
            seule. Le jour où la boîte du domaine existe, remplacer les deux occurrences ci-dessous
            ET poser la même adresse sur PRESTI_ALERTES_EMAIL, pour que la publication et la relève
            ne divergent jamais (scripts/legal-e2e.mjs §0 le vérifie).
            TÉLÉPHONE — la LCEN l'exige aussi d'une personne physique. Numéro fourni par le
            propriétaire le 05/09/2026 ; il est publié en clair, comme l'email, pour la même raison. */}
        <div><span className="k">Email</span> <a href="mailto:benjaminfiliot+presti@gmail.com">benjaminfiliot+presti@gmail.com</a></div>
        <div><span className="k">Téléphone</span> <a href="tel:+33630781647">06 30 78 16 47</a> (jours ouvrés, 9 h – 18 h)</div>
        <div><span className="k">Formulaire</span> <a href="/contact">la page « Nous écrire »</a> — même destinataire</div>
        <div><span className="k">Directeur de la publication</span> Benjamin Filiot</div>
      </div>

      <h2>Hébergement</h2>
      {/* Même adresse d'hébergeur que celle servie aux artisans (app/site/[slug]/infos-legales) :
          les deux surfaces désignaient deux sièges différents, l'un des deux étant périmé — et
          l'hébergeur est justement la mention que l'on va chercher pour signaler un contenu. */}
      <p>Le site est hébergé par <strong>Vercel Inc.</strong>, 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis — <a href="https://vercel.com" target="_blank" rel="noopener">vercel.com</a>.</p>
      <p>Les données applicatives (comptes, demandes, devis) sont hébergées via <strong>Supabase</strong>. Les paiements sont traités par <strong>Stripe</strong>.</p>

      <h2>Propriété intellectuelle</h2>
      <p>L’ensemble des éléments du site (marque « Presti », textes, interfaces, code, éléments graphiques) est protégé par le droit de la propriété intellectuelle et reste la propriété exclusive de l’éditeur, sauf mention contraire. Toute reproduction ou représentation, totale ou partielle, sans autorisation écrite préalable, est interdite.</p>

      <h2>Responsabilité</h2>
      <p>Presti est un outil d’assistance. L’éditeur s’efforce d’assurer l’exactitude des informations et le bon fonctionnement du service, sans garantie d’absence d’erreur ou d’interruption. L’utilisateur reste seul responsable de l’usage qu’il fait des contenus générés (devis, factures, réponses) et de leur vérification avant tout envoi à un tiers.</p>

      <h2>Données personnelles</h2>
      <p>Le traitement des données personnelles est détaillé dans notre <a href="/confidentialite">Politique de confidentialité</a>. Conformément au RGPD, vous disposez de droits d’accès, de rectification et de suppression que vous pouvez exercer à l’adresse email ci-dessus ou par <a href="/contact">le formulaire</a>.</p>

      <h2>Contact, support et litiges</h2>
      <p>Pour toute question : <a href="mailto:benjaminfiliot+presti@gmail.com">benjaminfiliot+presti@gmail.com</a> ou <a href="/contact">la page « Nous écrire »</a>. Les deux arrivent à la même boîte, relevée les jours ouvrés.</p>
      <p>Les délais de première réponse, offre par offre, figurent à l’article <a href="/cgu#support">« Support et assistance »</a> des conditions générales ; la marche à suivre en cas de réclamation ou de litige, à l’article <a href="/cgu#litiges">« Droit applicable et règlement des litiges »</a>.</p>

      <p style={{ marginTop: '2.4rem' }}><a href="/cgu">Conditions générales</a> · <a href="/confidentialite">Politique de confidentialité</a></p>
    </main>
  )
}
