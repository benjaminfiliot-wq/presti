'use client'

// L'atelier des composants (refonte 18/10, étape 4.3). Toutes les données sont des EXEMPLES, et l'écran le dit.
import '@/app/globals.css'
import '@/components/ui/ui.css'
import './atelier.css'
import { useState } from 'react'
import { Accordeon, BarreEtat, Bento, BentoTuile, Carte, EtatVide, PastilleOffre, Squelette, Statut, TuileChiffre } from '@/components/ui/base'
import Onglets from '@/components/ui/Onglets'
import Carrousel from '@/components/ui/Carrousel'
import Slides from '@/components/ui/Slides'
import Palette, { type Commande } from '@/components/ui/Palette'
import Toasts, { toast } from '@/components/ui/Toasts'
import { Icone } from '@/components/ui/icones'

const COMMANDES: Commande[] = [
  { id: 'a-jour', groupe: 'Aller à', libelle: 'Aujourd’hui', icone: 'jour', href: '#' },
  { id: 'a-devis', groupe: 'Aller à', libelle: 'Devis', icone: 'devis', href: '#', indice: '1 à relancer' },
  { id: 'a-factures', groupe: 'Aller à', libelle: 'Factures', icone: 'factures', href: '#' },
  { id: 'c-devis', groupe: 'Créer', libelle: 'Nouveau devis', icone: 'ajouter', indice: 'N', action: () => toast('Exemple : « Nouveau devis » ouvrirait l’éditeur.', 'info') },
  { id: 'c-mat', groupe: 'Créer', libelle: 'Ajouter un matériau', icone: 'inventaire', action: () => toast('Exemple : « Ajouter un matériau ».', 'info') },
  { id: 'h-visite', groupe: 'Aide', libelle: 'Revoir la visite guidée', icone: 'aide', action: () => toast('Exemple : la visite guidée se relancerait.', 'info') },
]
const chercherExemple = async (q: string): Promise<Commande[]> => {
  await new Promise((r) => setTimeout(r, 250))
  return [{ id: `r-${q}`, groupe: 'Résultats', libelle: `Mme Exemple-${q[0].toUpperCase()}${q.slice(1)} · devis DEV-2026-0007`, icone: 'devis', indice: 'exemple', href: '#' }]
}

const Bulle = ({ qui, texte, ia }: { qui: string; texte: string; ia?: boolean }) => (
  <div className={`atl-bulle${ia ? ' ia' : ''}`}><small>{qui}</small>{texte}</div>
)

export default function Atelier() {
  const [palette, setPalette] = useState(false)
  return (
    <main className="atl">
      <header className="atl-tete">
        <div>
          <span className="atl-sur">Refonte 18/10 · étape 4.3</span>
          <h1>Atelier des composants</h1>
          <p>Piste A « Instrument ». Chaque composant dans ses états. <Statut ton="warn">Données d’exemple</Statut></p>
        </div>
        <BarreEtat synchro="ok" credits={{ restants: 412, total: 600 }} offre="Signature" />
      </header>

      <section className="atl-bloc" aria-labelledby="t-boutons">
        <h2 id="t-boutons">Boutons, raccourcis, statuts, offres</h2>
        <div className="atl-rang">
          <button type="button" className="ui-btn ui-btn--p"><Icone nom="ajouter" />Nouveau devis <span className="ui-kbd">N</span></button>
          <button type="button" className="ui-btn ui-btn--s">Télécharger le PDF</button>
          <button type="button" className="ui-btn ui-btn--g">Dupliquer</button>
          <button type="button" className="ui-btn ui-btn--s" disabled>Indisponible</button>
          <button type="button" className="ui-btn ui-btn--s ui-btn--xs">Relancer</button>
        </div>
        <div className="atl-rang">
          <Statut>Brouillon</Statut><Statut ton="accent">Envoyé</Statut><Statut ton="warn">À relancer</Statut><Statut ton="ok">Accepté</Statut><Statut ton="crit">En retard</Statut>
        </div>
        <div className="atl-rang">
          <span className="atl-legende">Offre Essentiel :</span><PastilleOffre plan="essentiel" capacite="chiffres" />
          <span className="atl-legende">Offre Studio :</span><PastilleOffre plan="studio" capacite="crm" />
          <span className="atl-legende">Offre Signature :</span><PastilleOffre plan="signature" capacite="crm" inclus />
        </div>
      </section>

      <section className="atl-bloc" aria-labelledby="t-cartes">
        <h2 id="t-cartes">Cartes et tuiles de chiffre</h2>
        <Bento>
          <BentoTuile large>
            <Carte titre="Octobre" action={{ href: '#', libelle: 'Mes chiffres' }}>
              <div className="ui-tuiles">
                <TuileChiffre libelle="Facturé ce mois" valeur={4240} format="euros" sous="+12 % vs septembre" ton="ok" />
                <TuileChiffre libelle="En attente" valeur={1592} format="euros" sous="2 factures" />
                <TuileChiffre libelle="En retard" valeur={980} format="euros" sous="1 facture" ton="crit" />
                <TuileChiffre libelle="Devis à relancer" valeur={null} sous="non disponible" />
              </div>
            </Carte>
          </BentoTuile>
          <BentoTuile><Carte titre="Avec bordure lumineuse" lueur><p className="atl-p">Survolez : la bordure balaye. À l’arrêt, rien ne bouge.</p></Carte></BentoTuile>
          <BentoTuile><Carte titre="Chargement"><Squelette variante="chiffres" lignes={2} /></Carte></BentoTuile>
        </Bento>
      </section>

      <section className="atl-bloc" aria-labelledby="t-onglets">
        <h2 id="t-onglets">Onglets</h2>
        <Onglets etiquette="Exemple d’onglets" onglets={[
          { id: 'reponses', libelle: 'Réponses et devis', contenu: <p className="atl-p">La demande arrive, la réponse est prête : vous la relisez, vous l’envoyez.</p> },
          { id: 'chiffres', libelle: 'Chiffres', contenu: <p className="atl-p">Ce que vous avez facturé, encaissé, ce qui traîne.</p> },
          { id: 'compta', libelle: 'Compta', contenu: <p className="atl-p">Vos relevés rangés ; les montants calculés, jamais devinés.</p> },
        ]} />
      </section>

      <section className="atl-bloc" aria-labelledby="t-carrousel">
        <h2 id="t-carrousel">Carrousel (avance toutes les 6 s, avec pause)</h2>
        <Carte titre="Découvrir" className="atl-aube">
          <Carrousel etiquette="Découvrir" avance={6000} diapos={[
            { id: 'relances', titre: 'Les impayés se relancent seuls', contenu: <div className="atl-diapo"><PastilleOffre plan="signature" capacite="factures.relances" inclus /><h3>Les impayés se relancent seuls</h3><p className="atl-p">Une case à cocher : jusqu’à trois relances après l’échéance, dans un texte que vous avez relu.</p></div> },
            { id: 'assistant', titre: 'L’assistant de gestion', contenu: <div className="atl-diapo"><PastilleOffre plan="studio" capacite="assistant" /><h3>L’assistant de gestion</h3><p className="atl-p">Une phrase, et il prépare le devis ; vous confirmez ce qui part chez un client.</p></div> },
            { id: 'crm', titre: 'Le CRM atelier', contenu: <div className="atl-diapo"><PastilleOffre plan="studio" capacite="crm" /><h3>Le CRM atelier</h3><p className="atl-p">Vos chantiers, votre équipe et vos alertes sur une carte.</p></div> },
          ]} />
        </Carte>
      </section>

      <section className="atl-bloc" aria-labelledby="t-slides">
        <h2 id="t-slides">Slides « Comment ça marche » (épinglées sur ordinateur)</h2>
        <Slides etiquette="Comment ça marche, exemple" etapes={[
          { id: 'e1', sur: '22 h 14', titre: 'La demande arrive', texte: 'Par votre lien, sur votre fiche Google ou votre signature mail.', visuel: <Bulle qui="22 h 14 · Mme Garnier (exemple)" texte="Bonjour, mon chauffe-eau ne chauffe plus depuis hier soir." /> },
          { id: 'e2', sur: '22 h 15', titre: 'La réponse est prête', texte: 'Prête en moins d’une minute, dans votre ton. Vous la relisez, vous l’envoyez.', visuel: <Bulle ia qui="préparée par l’IA · à relire" texte="Bonjour Madame Garnier, de quelle marque est votre chauffe-eau, et quelle est sa capacité ?" /> },
          { id: 'e3', sur: '7 h 31', titre: 'Le devis, sur vos prix', texte: 'Presti le chiffre à partir de vos tarifs ; vous ajustez une ligne si besoin.', visuel: <Bulle qui="Devis · exemple fictif" texte="Chauffe-eau 200 L, groupe de sécurité, dépose, main-d’œuvre : 1 240,00 € TTC." /> },
          { id: 'e4', sur: 'Ensuite', titre: 'Relances et facture', texte: 'Trois relances prévues (J+2, J+5, J+10), la facture en un clic.', visuel: <Bulle qui="Ce qui suit" texte="Relances planifiées · Devis accepté · Facture émise" /> },
        ]} />
      </section>

      <section className="atl-bloc" aria-labelledby="t-acc">
        <h2 id="t-acc">Accordéon</h2>
        <Accordeon items={[
          { titre: 'Puis-je essayer gratuitement ?', contenu: 'Exemple de réponse : 3 crédits offerts, sans carte bancaire.', ouvert: true },
          { titre: 'Combien ça coûte ?', contenu: 'Exemple de réponse : un forfait mensuel avec des crédits inclus.' },
        ]} />
      </section>

      <section className="atl-bloc" aria-labelledby="t-pal">
        <h2 id="t-pal">Palette de commandes et confirmations</h2>
        <div className="atl-rang">
          <button type="button" className="ui-btn ui-btn--s" onClick={() => setPalette(true)}><Icone nom="cherche" />Ouvrir la palette <span className="ui-kbd">Ctrl K</span></button>
          <button type="button" className="ui-btn ui-btn--s" onClick={() => toast('Lien copié')}>Toast « ok »</button>
          <button type="button" className="ui-btn ui-btn--s" onClick={() => toast('Exemple : le devis est parti en brouillon.', 'info')}>Toast « info »</button>
          <button type="button" className="ui-btn ui-btn--s" onClick={() => toast('Exemple : l’envoi a échoué, réessayez.', 'crit')}>Toast « erreur »</button>
        </div>
        <Palette commandes={COMMANDES} chercher={chercherExemple} ouvert={palette || undefined} onFermer={() => setPalette(false)} />
      </section>

      <section className="atl-bloc" aria-labelledby="t-etats">
        <h2 id="t-etats">États : chargement, vide, hors ligne</h2>
        <Bento>
          <BentoTuile large><Carte titre="Liste en chargement"><Squelette variante="tableau" lignes={3} /></Carte></BentoTuile>
          <BentoTuile large><EtatVide icone="devis" titre="Aucun devis pour l’instant" texte="Ici s’affichent vos devis, du brouillon à la facture. Commencez par décrire un chantier : Presti chiffre sur vos prix." action={{ href: '#', libelle: 'Faire un premier devis' }} /></BentoTuile>
        </Bento>
        <div className="atl-rang"><BarreEtat synchro="hors-ligne" credits={{ restants: 3, total: 3 }} offre="Essai" /></div>
      </section>
      <Toasts />
    </main>
  )
}
