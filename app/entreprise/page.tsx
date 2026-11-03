import '@/app/globals.css'
import '@/app/accueil.css'
import '@/app/entreprise/entreprise.css'
import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import PublicNav from '@/app/PublicNav'
import PublicPied from '@/app/PublicPied'
import Motion from '@/app/Motion'
import { PLANS } from '@/lib/plans'

// La page « Presti pour l'entreprise » (036-026 ; prompt 6 § 2.8). Elle présente le VRAI produit : ce qui est construit pour
// l'entreprise, comment ça se passe, ce qui est garanti. Chaque phrase a sa source au fichier:ligne dans
// .orchestre/preuves/036-026/resume.md ; une phrase sans source n'a rien à faire ici.
// Interdits (juge : scripts/offre-entreprise-site-qa.mjs) : aucun prix, aucun chiffre de gain, aucun témoignage, aucun logo, aucune
// capture ; aucune fonction derrière un drapeau baissé de lib/flags.ts (ni l'organisation multi-membres, ni le mode privé, ni les
// canaux encore fermés) ; aucun mot creux.
// Design : la palette .lp de la landing (globals.css), son moteur d'apparition (Motion : tout reste visible sans JavaScript et sous
// prefers-reduced-motion), aucune 3D. Le seul geste signature est l'organigramme dessiné en code.

export const metadata: Metadata = {
  title: 'L’offre Entreprise : vos assistants IA sur mesure',
  description:
    'Une équipe d’assistants IA construite pour votre entreprise, branchée sur vos outils (Gmail, Outlook, Google Agenda, Slack, Teams, votre CRM), avec votre CRM et vos applications sur mesure. Sur devis, après un rendez-vous.',
  alternates: { canonical: '/entreprise' },
}

const LIEN = '/contact?motif=entreprise'

// Le sommaire de l'en-tête : les sections de cette page, rien d'autre.
const SOMMAIRE = [
  { href: '#organigramme', label: 'Votre organigramme d’assistants' },
  { href: '#outils', label: 'Vos outils branchés' },
  { href: '#applications', label: 'Votre CRM et vos applications' },
  { href: '#donnees', label: 'Vos données en Europe' },
  { href: '#comparer', label: 'Studio, Signature, Entreprise' },
  { href: '#garanties', label: 'Vos garanties' },
]

const ico = (d: ReactNode) => <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>
const I = {
  contrat: ico(<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6" /><path d="M8 13h8M8 17h5" /></>),
  liste: ico(<><path d="M9 6h11M9 12h11M9 18h11" /><path d="m3 6 1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17" /></>),
  main: ico(<><circle cx="12" cy="12" r="9" /><path d="m8.5 12 2.5 2.5 4.5-5" /></>),
  stop: ico(<><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>),
  plus: ico(<><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M12 8v8M8 12h8" /></>),
  europe: ico(<><circle cx="12" cy="12" r="9" /><path d="M3 12h18" /><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18" /></>),
}

// L'organigramme (§ 2.6). On ne garde chez un client que les services qu'exige un irritant signé : ceux-ci sont des exemples.
const SERVICES: { nom: string; specialistes: string[] }[] = [
  { nom: 'Accueil et qualification', specialistes: ['Lecteur de vos boîtes', 'Trieur', 'Qualificateur à votre grille', 'Répondeur'] },
  { nom: 'Ventes', specialistes: ['Chiffreur sur vos prix', 'Rédacteur de propositions', 'Relanceur'] },
  { nom: 'Administratif', specialistes: ['Pièce manquante', 'Échéances', 'Archiviste'] },
  { nom: 'Finance', specialistes: ['Facturier', 'Relanceur d’impayés', 'Export au comptable'] },
]
const AUTRES_SERVICES = ['Opérations', 'Après-vente et réputation', 'Direction', 'Marketing']

// Les outils, sous leur vrai nom : seulement ceux qu'un nœud n8n natif ou une API documentée relie (OUTILLAGE.md § 3 et § 7).
const OUTILS: { groupe: string; noms: string[] }[] = [
  { groupe: 'Messagerie et agenda', noms: ['Gmail', 'Outlook', 'Google Agenda'] },
  { groupe: 'Documents et tableurs', noms: ['Google Drive', 'Google Docs', 'Google Sheets', 'OneDrive', 'Excel'] },
  { groupe: 'Équipe', noms: ['Slack', 'Microsoft Teams', 'Google Chat'] },
  { groupe: 'CRM', noms: ['HubSpot', 'Pipedrive', 'Salesforce', 'Zoho CRM', 'Odoo', 'Airtable', 'Notion', 'monday', 'ClickUp'] },
  { groupe: 'Paiement et compta', noms: ['Stripe', 'QuickBooks', 'Xero', 'Pennylane', 'Tiime', 'Sage'] },
  { groupe: 'Signature et avis', noms: ['Yousign', 'DocuSign', 'Fiche Google'] },
]

// Les sept applications du § 2.5 : pour qui, ce qu'elle fait.
const APPLICATIONS: { nom: string; pour: string; fait: string; large?: boolean }[] = [
  { nom: 'Centre de commande de direction', pour: 'gérant, associés', fait: 'Vos données à jour, la page du matin, l’approbation d’un clic de ce que préparent les assistants, leur organigramme et leur état, le coût de l’IA.', large: true },
  { nom: 'CRM sur mesure', pour: 'administratif, commerciaux', fait: 'Vos étapes, vos champs, vos vues par rôle. Une ligne « fait » sous chaque action, et l’import de votre export pour démarrer sur vos vrais chiffres.' },
  { nom: 'Vue « monde » de l’entreprise', pour: 'direction', fait: 'Vos sites, vos équipes, vos chantiers et votre stock, dessinés comme un monde cliquable, sur vos vraies données.' },
  { nom: 'App de terrain', pour: 'compagnons, techniciens', fait: 'Les chantiers du jour, les photos, les PV, la signature du client, le temps passé, le matériel utilisé.' },
  { nom: 'Portail de vos clients', pour: 'vos clients', fait: 'Le suivi du dossier, les documents, les devis à signer, les factures, la demande d’intervention avec photo.' },
  { nom: 'Formulaires métier', pour: 'votre équipe, vos clients', fait: 'Demande d’intervention, état des lieux, check-list de fin de chantier, avec dictée.' },
  { nom: 'Tableaux de bord et rapports', pour: 'direction, comptable', fait: 'Vos indicateurs face à votre point de départ, chaque chiffre avec sa source et sa date, et le PDF du lundi.', large: true },
]

// Studio, Signature et Entreprise côte à côte (§ 2.2), sans les lignes dont la fonction n'est pas en ligne (organisation
// multi-membres, mode privé). Les colonnes Studio et Signature disent ce que lib/plans.ts leur donne aujourd'hui.
const COMPARE: { ligne: string; studio: string; signature: string; entreprise: string }[] = [
  { ligne: 'Autonomie', studio: PLANS.studio.accroche, signature: PLANS.signature.accroche, entreprise: 'Celle de Signature, réglée type par type et fixée au contrat.' },
  { ligne: 'Assistants', studio: 'L’assistant de gestion, qui prépare', signature: 'L’assistant de gestion et le Pilote automatique', entreprise: 'Un organigramme d’assistants propre à votre entreprise, chaque service avec son chef' },
  { ligne: 'Ce qui les guide', studio: 'Vos réglages', signature: 'Vos réglages', entreprise: 'Vos procédures écrites, recueillies une à une' },
  { ligne: 'Outils', studio: 'Votre boîte e-mail', signature: 'Votre boîte e-mail', entreprise: 'Tous vos outils : Google Workspace ou Microsoft 365, Slack ou Teams, votre CRM, votre compta, votre signature électronique, vos tableurs' },
  { ligne: 'Données', studio: 'Celles que vous gérez dans Presti', signature: 'Celles que vous gérez dans Presti', entreprise: 'Les vôtres, synchronisées depuis vos outils, avec la date de la dernière synchronisation' },
  { ligne: 'CRM', studio: 'Non inclus', signature: 'Le CRM « atelier »', entreprise: 'Un CRM sur mesure : vos champs, vos étapes, vos rôles, vos vues' },
  { ligne: 'Applications', studio: 'La console Presti', signature: 'La console Presti', entreprise: 'Des applications sur mesure : centre de commande, app de terrain, portail de vos clients, formulaires, tableaux de bord' },
  { ligne: 'Pilotage', studio: 'Votre console et « Mes chiffres »', signature: 'Votre console et « Mes chiffres »', entreprise: 'Page du matin de direction, rapport du lundi, bilan à un mois, point mensuel' },
  { ligne: 'Évolution', studio: 'Celle du produit', signature: 'Celle du produit', entreprise: 'De nouveaux assistants, services et applications par avenant, sans toucher au reste' },
]

// Les cinq temps (§ 2.8), chacun résumé d'après les étapes du § 2.4.
const TEMPS: { titre: string; texte: string }[] = [
  { titre: 'Rendez-vous', texte: 'Un rendez-vous de découverte : votre métier, vos outils, ce qui vous fait perdre le plus de temps. Vos chiffres se lisent dans vos outils, pas à l’estime.' },
  { titre: 'Accueil', texte: 'Un formulaire en deux temps, avec dictée : d’abord vos outils et vos accès, puis chaque tâche, pas à pas. Vos procédures deviennent des compétences écrites, que vous relisez.' },
  { titre: 'Proposition', texte: 'Ce qui sera construit, le calendrier et le coût récurrent mesuré, en deux options réelles. Le devis vous est envoyé avant, puis parcouru avec vous ligne à ligne. Vous signez le devis, le contrat de sous-traitance et l’annexe d’autonomie.' },
  { titre: 'Mise en service', texte: 'Tout est d’abord construit et testé sur des données de test, sans toucher vos outils. Puis le mode ombre sur vos vraies données : tout se prépare, rien ne sort. Puis la validation d’un clic. Puis l’automatique, type par type, sur votre accord écrit.' },
  { titre: 'Suivi mensuel', texte: 'La page du matin, le rapport du lundi, un bilan à un mois, puis un point chaque mois. Chaque refus de votre part ajuste une procédure ou une règle.' },
]

// Les garanties (§ 2.4, § 2.6, § 2.9, § 2.2).
const GARANTIES: { icone: ReactNode; titre: string; texte: string }[] = [
  { icone: I.contrat, titre: 'Un contrat de sous-traitance RGPD', texte: 'Article 28 : Presti agit comme sous-traitant, et chaque sous-traitant ultérieur est nommé.' },
  { icone: I.liste, titre: 'La liste des accès en écriture, signée', texte: 'Vos outils commencent en lecture. Un assistant n’écrit que là où vous l’avez signé.' },
  { icone: I.main, titre: 'Rien ne part sans votre accord au début', texte: 'Mode ombre, puis validation d’un clic. L’automatique vient type par type, quand vous l’acceptez par écrit.' },
  { icone: I.stop, titre: 'Ce qui ne part jamais seul', texte: 'Encaisser, rembourser ou payer ; émettre ou modifier une facture scellée ; supprimer des données ; répondre seul à un avis négatif. Même au contrat.' },
  { icone: I.plus, titre: 'De nouveaux assistants par avenant', texte: 'Un service, un assistant ou une application de plus s’ajoute par avenant, sans toucher au reste.' },
]

const QUESTIONS: { q: string; r: string }[] = [
  { q: 'Combien ça coûte ?', r: 'C’est sur devis : il n’y a pas de prix public. Le prix se fixe après le rendez-vous de découverte, dans la proposition, avec deux options réelles et un devis parcouru avec vous ligne à ligne.' },
  { q: 'En combien de temps est-ce en place ?', r: 'Le calendrier est écrit dans la proposition, pour ce qui sera construit chez vous. Chaque outil est d’abord essayé en lecture : on ne promet rien avant d’avoir vu qu’il se lit bien.' },
  { q: 'Faut-il changer d’outils ?', r: 'Non. On branche ceux que vous utilisez déjà : les assistants travaillent dans vos outils, pas à côté.' },
  { q: 'Où vont nos données ?', r: 'Votre base de données est hébergée chez Supabase, à Francfort. D’un client à l’autre, seuls les gabarits se réutilisent, jamais les données. Les modèles d’IA ne sont pas tous en Europe : chaque fournisseur est nommé dans le contrat de sous-traitance, et aucune de vos données ne part vers un modèle gratuit en ligne.' },
  { q: 'Qui valide ce qui part ?', r: 'Vous, au début : rien ne sort sans votre clic. Ensuite, seuls les types d’action que vous acceptez par écrit partent seuls. Payer, encaisser, rembourser, supprimer des données ou répondre à un avis négatif ne partent jamais seuls.' },
  { q: 'Est-ce le même moteur que Signature ?', r: 'Oui, avec la même autonomie, réglée par type d’action et fixée au contrat. Ce qui change, c’est que les assistants, le CRM et les applications sont écrits pour vous.' },
]

export default function Entreprise() {
  const p = PLANS.entreprise
  return (
    <div className="lp ent">
      <Motion />
      <PublicNav />

      <main>
        {/* 1. L'en-tête : la promesse, deux phrases, le bouton. */}
        <section className="ent-hero">
          <div className="container ent-hero-grille">
            <div className="ent-hero-texte">
            <span className="lp-kick ent-hero-kick">{p.label}</span>
            <h1>Votre propre équipe d’assistants IA, <span className="g">construite pour votre entreprise.</span></h1>
            <p className="ent-lede">Des assistants écrits d’après ce qui vous fait perdre du temps, chacun avec son rôle, qui travaillent dans les outils que vous utilisez déjà. Au début, rien ne part sans votre accord ; ensuite, seuls les types d’action que vous acceptez par écrit partent seuls.</p>
            <div className="ent-cta">
              <a className="lp-btn lp-btn--p lp-btn--lg" href={LIEN} data-entreprise-contact>Parler à l’équipe</a>
              <a className="lp-btn lp-btn--g lp-btn--lg" href="#parcours">Comment ça se passe</a>
            </div>
            <ul className="ent-faits" aria-label="En bref">
              <li>Sur devis, aucun prix public</li>
              <li>Même autonomie que Signature</li>
              <li>Base de données à Francfort</li>
            </ul>
            </div>
            <nav className="ent-sommaire" aria-label="Sur cette page">
              <span className="ent-sommaire-t">Sur cette page</span>
              <ul>
                {SOMMAIRE.map((s) => <li key={s.href}><a href={s.href}>{s.label}<i aria-hidden="true">↓</i></a></li>)}
              </ul>
            </nav>
          </div>
        </section>

        {/* 2. Ce que vous obtenez. */}
        <section className="lp-blk ent-obtenez" id="contenu">
          <div className="container">
            <div className="lp-head2 reveal">
              <span className="lp-kick">Ce que vous obtenez</span>
              <h2>Une équipe, vos outils, vos applications.</h2>
              <p>Tout est construit pour vous, à partir de ce qui vous fait perdre du temps : on ne garde que ce qui vous sert.</p>
            </div>

            {/* 2a. L'organigramme d'assistants, dessiné en code (§ 2.6). */}
            <div className="ent-bloc" id="organigramme">
              <div className="ent-bloc-t reveal">
                <h3>Votre organigramme d’assistants</h3>
                <p>Qui décide, qui exécute, qui rapporte. Vous pouvez parler à chaque niveau, par exemple « Où en est la relance des impayés ? » : l’assistant lit l’état réel, il ne devine pas.</p>
              </div>
              <figure className="ent-org reveal" aria-label="L’organigramme de vos assistants, du haut vers le bas">
                <span className="ent-pouls" aria-hidden="true" />
                <div className="ent-rang">
                  <div className="ent-rang-l"><small>Rang 0</small><b>Vous</b></div>
                  <div className="ent-noeuds">
                    <div className="ent-noeud ent-noeud--vous"><b>Vous et votre équipe</b><em>Vous décidez, vous validez, vous pouvez tout couper.</em></div>
                  </div>
                </div>
                <div className="ent-rang">
                  <div className="ent-rang-l"><small>Rang 1</small><b>Pilotage</b></div>
                  <div className="ent-noeuds ent-noeuds--2">
                    <div className="ent-noeud ent-noeud--cerveau"><b>Le Cerveau</b><em>Trie, lit et écrit, parle, vérifie. Il répartit le travail et ne décide jamais d’un montant.</em></div>
                    <div className="ent-noeud"><b>La porte de conformité</b><em>Un veto sur tout ce qui sort. Elle ne peut rien envoyer elle-même.</em></div>
                  </div>
                </div>
                <div className="ent-rang">
                  <div className="ent-rang-l"><small>Rangs 2 et 3</small><b>Services</b></div>
                  <div>
                    <ul className="ent-services">
                      {SERVICES.map((s) => (
                        <li key={s.nom} className="ent-service">
                          <span className="ent-service-chef">Chef de service</span>
                          <b>{s.nom}</b>
                          <ul>{s.specialistes.map((x) => <li key={x}>{x}</li>)}</ul>
                        </li>
                      ))}
                    </ul>
                    <p className="ent-autres">Et selon ce qui vous fait perdre du temps : {AUTRES_SERVICES.join(', ')}.</p>
                  </div>
                </div>
                <div className="ent-rang">
                  <div className="ent-rang-l"><small>Rang 3</small><b>Connecteurs</b></div>
                  <div className="ent-noeuds">
                    <div className="ent-noeud ent-noeud--outils"><b>Vos outils</b><em>Les connecteurs lisent, et n’écrivent que sur la liste d’accès que vous signez.</em></div>
                  </div>
                </div>
              </figure>
            </div>

            {/* 2b. Les outils, sous leur vrai nom, en étiquettes de texte (aucun logo). */}
            <div className="ent-bloc ent-bloc--2" id="outils">
              <div className="ent-bloc-t reveal">
                <h3>Vos outils branchés, sous leur vrai nom</h3>
                <p>Les assistants travaillent dans vos outils, pas à côté. Vous donnez vous-même chaque accès ; chaque outil commence en lecture, et on vérifie qu’il se lit bien avant de vous promettre quoi que ce soit.</p>
              </div>
              <dl className="ent-outils reveal-kids">
                {OUTILS.map((g) => (
                  <div key={g.groupe} className="ent-outils-g">
                    <dt>{g.groupe}</dt>
                    <dd><ul>{g.noms.map((n) => <li key={n} className="ent-tag">{n}</li>)}</ul></dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* 2c. Le CRM et les applications sur mesure (§ 2.5). */}
            <div className="ent-bloc ent-bloc--plein" id="applications">
              <div className="ent-bloc-t reveal">
                <h3>Votre CRM et vos applications sur mesure</h3>
                <p>À votre nom et à vos couleurs. On part de ce catalogue, on choisit et on adapte ce qu’exige votre entreprise. Un écran par rôle, et tout ce qu’un assistant fait, un bouton le fait aussi.</p>
              </div>
              <ul className="ent-apps reveal-kids">
                {APPLICATIONS.map((a) => (
                  <li key={a.nom} className={`ent-app lp-spot${a.large ? ' ent-app--large' : ''}`}>
                    <span className="ent-app-pour">Pour : {a.pour}</span>
                    <b>{a.nom}</b>
                    <p>{a.fait}</p>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2d. Les données en Europe — sans dire que rien n'en sort : les modèles d'IA ne sont pas tous en Europe. */}
            <div className="ent-europe reveal" id="donnees">
              <span className="ent-europe-i">{I.europe}</span>
              <div>
                <h3>Vos données hébergées en Europe</h3>
                <p>Votre base de données est chez Supabase, à Francfort (région eu-central-1). D’un client à l’autre, seuls les gabarits se réutilisent, jamais les données. Les modèles d’IA, eux, ne sont pas tous en Europe : chaque fournisseur est nommé dans le contrat de sous-traitance, et aucune de vos données ne part vers un modèle gratuit en ligne.</p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Studio, Signature et Entreprise côte à côte (§ 2.2). */}
        <section className="lp-blk lp-clair ent-cmp" id="comparer">
          <div className="container">
            <div className="lp-head2 c reveal">
              <span className="lp-kick">{PLANS.studio.label}, {PLANS.signature.label}, Entreprise</span>
              <h2>Ce que le sur-mesure ajoute.</h2>
              <p>Le même moteur que Signature, avec la même autonomie. Ce qui change, c’est que tout est écrit pour vous.</p>
            </div>
            <div className="ent-table-cadre reveal">
              <table className="ent-table">
                <thead>
                  <tr>
                    <th scope="col"><span className="sr-only">Ligne</span></th>
                    <th scope="col">{PLANS.studio.label}</th>
                    <th scope="col">{PLANS.signature.label}</th>
                    <th scope="col" className="ent-col">Entreprise</th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARE.map((l) => (
                    <tr key={l.ligne}>
                      <th scope="row">{l.ligne}</th>
                      <td data-col={PLANS.studio.label}>{l.studio}</td>
                      <td data-col={PLANS.signature.label}>{l.signature}</td>
                      <td data-col="Entreprise" className="ent-col">{l.entreprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 4. Comment ça se passe : les cinq temps (§ 2.8, § 2.4). */}
        <section className="lp-blk ent-parcours" id="parcours">
          <div className="container">
            <div className="lp-head2 c reveal">
              <span className="lp-kick">Comment ça se passe</span>
              <h2>Cinq temps, et rien ne se construit sans votre accord écrit.</h2>
            </div>
            <ol className="ent-temps reveal-kids">
              {TEMPS.map((t, i) => (
                <li key={t.titre} className="ent-temps-e">
                  <span className="ent-temps-n" aria-hidden="true">{i + 1}</span>
                  <b>{t.titre}</b>
                  <p>{t.texte}</p>
                </li>
              ))}
            </ol>
            <div className="ent-relance reveal">
              <p>Le premier temps, c’est un rendez-vous.</p>
              <a className="lp-btn lp-btn--p" href={LIEN} data-entreprise-contact>Parler à l’équipe</a>
            </div>
          </div>
        </section>

        {/* 5. Les garanties. */}
        <section className="lp-blk ent-garanties" id="garanties">
          <div className="container">
            <div className="lp-head2 c reveal">
              <span className="lp-kick">Vos garanties</span>
              <h2>Ce qui est écrit au contrat.</h2>
            </div>
            <ul className="ent-gar reveal-kids">
              {GARANTIES.map((g) => (
                <li key={g.titre} className="ent-gar-e lp-spot">
                  <span className="ent-gar-i">{g.icone}</span>
                  <b>{g.titre}</b>
                  <p>{g.texte}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 6. Questions fréquentes. */}
        <section className="lp-blk" id="questions">
          <div className="container">
            <div className="lp-head2 c reveal"><span className="lp-kick">Questions</span><h2>Ce qu’on nous demande avant le rendez-vous.</h2></div>
            <div className="lp-faq">
              {QUESTIONS.map((f) => (
                <details className="faq-item" key={f.q}>
                  <summary>{f.q}</summary>
                  <div className="faq-a">{f.r}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Le bandeau final. */}
        <section className="lp-blk lp-final reveal">
          <div className="container">
            <h2>Parlons de ce qui vous fait<br /><span className="g">perdre du temps.</span></h2>
            <p>Un premier rendez-vous pour comprendre votre entreprise et vos outils. Ensuite, une proposition avec deux options réelles.</p>
            <a className="lp-btn lp-btn--p lp-btn--lg" href={LIEN} data-entreprise-contact>Parler à l’équipe</a>
          </div>
        </section>
      </main>

      <PublicPied />
    </div>
  )
}
