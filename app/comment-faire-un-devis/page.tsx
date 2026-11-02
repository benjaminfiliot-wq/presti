import '@/app/globals.css'
import '@/app/ressources.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import Breadcrumb from '@/app/Breadcrumb'
import PublicNav from '@/app/PublicNav'
import PublicPied from '@/app/PublicPied'
import { AppelPresti, JsonLd, PourAllerPlusLoin, Source } from '@/app/SeoBlocs'
import { BASE, MENTIONS_DEVIS, SOURCES } from '@/lib/seoDevis'

// Guide « comment faire un devis » (27/10/2026) : vise « comment faire un devis », « mentions obligatoires devis », « devis gratuit
// artisan ». Chaque règle renvoie à son texte (lib/seoDevis.ts, SOURCES). Aucun montant d'amende ni de délai n'est écrit ici sans
// la page officielle qui le porte.

const TITRE = 'Comment faire un devis d’artisan : mentions obligatoires et étapes'
const DESC = 'Les mentions obligatoires d’un devis de travaux, textes officiels à l’appui, et les sept étapes pour le rédiger : chiffrage, TVA, validité, signature.'

export const metadata: Metadata = {
  title: TITRE,
  description: DESC,
  alternates: { canonical: '/comment-faire-un-devis' },
}

const ETAPES: { titre: string; texte: string }[] = [
  { titre: 'Comprendre la demande', texte: 'Avant de chiffrer, posez les questions qui manquent : l’appareil ou l’ouvrage en cause, les dimensions, l’accès au chantier, une photo. Un devis fait sur une demande floue se renégocie au chantier.' },
  { titre: 'Visiter si nécessaire', texte: 'Pour un ouvrage sur mesure ou un existant que vous ne voyez pas, une visite évite de chiffrer à l’aveugle. Si elle est payante, le devis le dit, et dit combien.' },
  { titre: 'Découper en lignes', texte: 'Une ligne par prestation ou produit, avec sa quantité, son unité (heure, mètre carré, mètre linéaire, unité) et son prix unitaire HT. C’est le « décompte détaillé » exigé.' },
  { titre: 'Appliquer le bon taux de TVA', texte: 'Le taux dépend des travaux et du logement. En franchise en base, aucune TVA, et la mention « TVA non applicable, article 293 B du CGI ».' },
  { titre: 'Écrire les conditions', texte: 'Taux horaire TTC et décompte du temps, frais de déplacement, enlèvement des déchets, durée de validité, gratuit ou payant, conditions de paiement.' },
  { titre: 'Relire les mentions', texte: 'Entreprise, SIRET, assurance décennale quand elle est obligatoire, client, lieu, nature des travaux, totaux HT et TTC. La liste complète est ci-dessous.' },
  { titre: 'Envoyer et faire signer', texte: 'Le client date et signe avec « Bon pour accord ». Signé, le devis engage les deux parties : ce qui n’y figure pas se discute en avenant.' },
]

export default function PageGuide() {
  const url = `${BASE}/comment-faire-un-devis`
  return (
    <div className="pub res">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'HowTo',
        name: 'Comment faire un devis d’artisan',
        description: DESC,
        inLanguage: 'fr-FR',
        url,
        tool: [{ '@type': 'HowToTool', name: 'Générateur de devis gratuit', url: `${BASE}/generateur-devis` }],
        step: ETAPES.map((e, i) => ({ '@type': 'HowToStep', position: i + 1, name: e.titre, text: e.texte, url: `${url}#etape-${i + 1}` })),
      }} />
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: TITRE,
        description: DESC,
        inLanguage: 'fr-FR',
        url,
        datePublished: '2026-10-27',
        dateModified: '2026-10-27',
        author: { '@type': 'Organization', '@id': `${BASE}/#org`, name: 'Presti', url: BASE },
        publisher: { '@type': 'Organization', '@id': `${BASE}/#org`, name: 'Presti', url: BASE },
        citation: Object.values(SOURCES).map((s) => s.url),
      }} />
      <PublicNav />
      <main className="pub-main">
        <div className="container res-article">
          <header className="res-tete">
            <Breadcrumb label="Comment faire un devis" path="/comment-faire-un-devis" />
            <span className="legal-kick">Guide</span>
            <h1 className="pub-titre">Comment faire <span>un devis</span></h1>
            <p className="pub-intro res-intro">
              Un devis d’artisan, c’est une offre de prix que le client signe et qui vous engage tous les deux. Voici ce qu’il doit contenir,
              d’après les fiches officielles, et la façon de le rédiger sans rien oublier.
            </p>
            <p className="res-maj">Mis à jour le 27 octobre 2026 · sources officielles citées à chaque règle</p>
          </header>

          <section className="res-encadre" aria-label="L’essentiel">
            <h2>L’essentiel</h2>
            <ul className="pub-points">
              <li><i /><span>Pour les travaux et dépannages du bâtiment et de l’équipement de la maison, le devis préalable est obligatoire (<Source cle="servicePublicDevis" />).</span></li>
              <li><i /><span>Il précise s’il est gratuit ou payant, et son coût s’il est payant.</span></li>
              <li><i /><span>Il porte un décompte détaillé, les totaux HT et TTC avec le taux de TVA, et une durée de validité.</span></li>
              <li><i /><span>Le plus simple pour ne rien oublier : le <Link href="/generateur-devis">générateur de devis gratuit</Link>, qui vérifie les mentions pendant que vous écrivez.</span></li>
            </ul>
          </section>

          <section id="mentions">
            <h2>Les mentions obligatoires d’un devis de travaux</h2>
            <p>
              La liste ci-dessous reprend, dans son ordre, la fiche <Source cle="servicePublicBatiment" />, complétée par le SIRET
              (<Source cle="artisanatMentions" />) et par l’information sur les pièces remplacées pour un dépannage (<Source cle="servicePublicDevis" />).
            </p>
            <div className="res-table-cadre">
              <table className="res-table">
                <thead><tr><th scope="col">Mention</th><th scope="col">Ce qu’on y écrit</th><th scope="col">Quand</th></tr></thead>
                <tbody>
                  {MENTIONS_DEVIS.map((m) => (
                    <tr key={m.cle}><th scope="row">{m.label}</th><td>{m.detail}</td><td>{m.condition ?? 'toujours'}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              La fiche précise aussi que l’absence de devis expose à une amende administrative ; son montant y est indiqué selon que
              l’entreprise est une personne physique ou une société.
            </p>
          </section>

          <section id="etapes">
            <h2>Rédiger un devis en sept étapes</h2>
            <ol className="res-etapes">
              {ETAPES.map((e, i) => <li key={i} id={`etape-${i + 1}`}><b>{e.titre}.</b> {e.texte}</li>)}
            </ol>
          </section>

          <section id="tva">
            <h2>Quel taux de TVA sur un devis de travaux ?</h2>
            <p>
              Le taux normal est de 20 %. Des taux réduits existent pour certains travaux dans les logements achevés depuis plus de deux ans :
              10 % pour l’amélioration, la transformation, l’aménagement et l’entretien, 5,5 % pour certains travaux de rénovation énergétique.
              La fiche service-public le rappelle : le taux peut varier selon la nature des travaux.
            </p>
            <p>
              Depuis la loi de finances pour 2025, l’attestation que le client remplissait pour bénéficier du taux réduit est remplacée par une
              mention portée sur le devis ou la facture qu’il signe. Les organisations professionnelles publient des modèles de formulation :
              <Source cle="tvaReduiteCapeb" /> ; <Source cle="tvaReduiteFfb" />.
            </p>
            <p>
              En micro-entreprise sous la franchise en base, vous ne facturez pas de TVA et le devis porte la mention « TVA non applicable,
              article 293 B du CGI » (<Source cle="franchiseTva" />).
            </p>
          </section>

          <section id="gratuit">
            <h2>Devis gratuit ou payant ?</h2>
            <p>
              Les deux sont possibles, mais le devis doit le dire, et indiquer son coût lorsqu’il est payant (<Source cle="servicePublicBatiment" />).
              Un déplacement ou une étude facturés s’annoncent donc avant d’être faits. Pour un dépannage, une réparation ou un entretien, l’arrêté
              du 24 janvier 2017 encadre en plus l’information sur les prix (<Source cle="arrete2017" />).
            </p>
          </section>

          <section id="assurance">
            <h2>L’assurance décennale sur le devis</h2>
            <p>
              Lorsque vos travaux relèvent de la garantie décennale, le devis indique les coordonnées de votre assureur et la zone géographique
              couverte, et l’attestation d’assurance l’accompagne (<Source cle="assuranceDecennale" /> ; <Source cle="artisanatAssurance" />).
            </p>
          </section>

          <section id="apres">
            <h2>Après la signature</h2>
            <p>
              Le devis signé fixe le prix et le contenu des travaux. Quand le chantier est fait, la facture reprend le devis accepté : c’est là
              qu’un logiciel fait gagner du temps, en transformant le devis en facture sans ressaisie.
            </p>
          </section>

          <AppelPresti
            titre="Le devis, sans repartir de zéro à chaque fois"
            texte="Presti chiffre le devis par l’IA à partir de vos tarifs, ajoute les mentions de votre entreprise, et le transforme en facture conforme quand le client accepte."
          />

          <PourAllerPlusLoin courant="/comment-faire-un-devis" />
        </div>
      </main>
      <PublicPied />
    </div>
  )
}
