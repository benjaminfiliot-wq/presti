'use client'
// Les sept démonstrations animées de la section 4 (033-009) : chacune recrée un VRAI écran de Presti, avec des données d'exemple
// (lib/landing/demos.ts), et joue le geste que le produit fait aujourd'hui. Moteur commun : ./scene.tsx (état final sans JS et en
// mouvement réduit). Toutes sont décor pour les lecteurs d'écran (aria-hidden) : le texte alternatif est porté par la figure parente.
import { useEffect, useState } from 'react'
import { EXEMPLES, euros, type IdDemo } from '@/lib/landing/demos'
import { Coche, Fenetre, useScene } from './scene'

/** Frappe d'un texte, caractère par caractère, tant que `actif` ; le texte entier quand la scène ne joue pas. */
function useFrappe(texte: string, actif: boolean, pas = 28) {
  const [n, setN] = useState(texte.length)
  useEffect(() => {
    if (!actif) { setN(texte.length); return }
    setN(0)
    let i = 0
    const t = window.setInterval(() => { i += 1; setN(i); if (i >= texte.length) clearInterval(t) }, pas)
    return () => clearInterval(t)
  }, [actif, texte, pas])
  return texte.slice(0, n)
}

/* 1 · Réponse aux demandes : la demande arrive, la réponse se prépare, l'artisan valide, elle part à son nom. */
function Reponse() {
  const e = EXEMPLES.reponse
  const { etape, joue, racine, vu } = useScene([500, 1100, 1700, 1500])
  const envoye = etape >= 4
  return (
    <Fenetre ecran="conversation" racine={racine} joue={joue}>
      <div className="dm-tete"><span className="dm-avatar">{e.client[0]}</span><div><b>{e.client}</b><small>depuis votre page</small></div><span className="dm-etat">Nouvelle demande</span></div>
      <div className="dm-fil">
        <p className={`dm-bulle dm-bulle--in ${vu(1)}`}>{e.demande}</p>
        <p className={`dm-frappe ${etape === 2 ? 'd-vu' : 'd-pas'}`}><i /><i /><i /><span>Presti prépare la réponse</span></p>
        <div className={`dm-bulle dm-bulle--out ${vu(3)}`}>
          <p>{e.reponse}</p>
          <span className="dm-signe">{e.signataire}</span>
        </div>
      </div>
      <div className={`dm-pied ${vu(3)}`}>
        <span className="dm-statut">{envoye ? <><Coche />Envoyée, à votre nom</> : 'Préparée · à valider'}</span>
        {envoye ? null : <span className={`dm-bouton${etape === 3 ? ' est-appui' : ''}`}>Valider et envoyer</span>}
      </div>
    </Fenetre>
  )
}

/* 2 · Devis : les lignes se remplissent, chacune dit d'où vient son prix ; le total arrive. */
function Devis() {
  const d = EXEMPLES.devis
  const { joue, racine, vu } = useScene([400, 750, 750, 750, 750, 700])
  const total = d.lignes.reduce((s, l) => s + l.montant, 0)
  return (
    <Fenetre ecran="devis" racine={racine} joue={joue}>
      <div className="dm-tete dm-tete--doc"><div><small>Brouillon de devis</small><b>{d.titre}</b></div><span className="dm-etat">À relire</span></div>
      <table className="dm-lignes">
        <tbody>
          {d.lignes.map((l, i) => (
            <tr key={l.designation} className={vu(i + 1)}>
              <td>{l.designation}<small>{l.qte}</small></td>
              <td><span className={`dm-source dm-source--${l.source}`}>{l.source === 'tarifs' ? 'Mes tarifs' : 'Estimé'}</span></td>
              <td className="dm-montant">{euros(l.montant)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={`dm-total ${vu(5)}`}><span>Total HT</span><b>{euros(total)}</b></div>
      <p className={`dm-note ${vu(6)}`}><span className="dm-source dm-source--estime">Estimé</span>attend votre accord avant l’envoi.</p>
    </Fenetre>
  )
}

/* 3 · Relances : la frise J+2, J+5, J+10 ; « à valider » en Studio, « partira dans 7 min » en Signature ; arrêt à la réponse. */
function Relances() {
  const { etape, joue, racine, vu } = useScene([500, 900, 900, 1300, 1500])
  const arret = etape >= 5
  const jalons = [{ j: 'J+2', k: 2 }, { j: 'J+5', k: 3 }, { j: 'J+10', k: 4 }]
  return (
    <Fenetre ecran="relances" racine={racine} joue={joue}>
      <div className="dm-tete dm-tete--doc"><div><small>Devis D-2026-031</small><b>Envoyé lundi, sans réponse</b></div><span className="dm-etat">{arret ? 'Le client a répondu' : 'En attente'}</span></div>
      <div className="dm-frise">
        <span className="dm-frise-piste"><i style={{ transform: `scaleX(${arret ? 1 / 3 : Math.min(1, Math.max(0, (etape - 1) / 3))})` }} /></span>
        <span className={`dm-jalon dm-jalon--depart ${vu(0)}`}><b>Envoi</b></span>
        {jalons.map((x) => <span key={x.j} className={`dm-jalon ${vu(x.k)}${arret && x.k > 2 ? ' est-arrete' : ''}`}><b>{x.j}</b></span>)}
      </div>
      <div className="dm-cartes">
        <div className={`dm-carte ${vu(2)}`}><span className="dm-offre">Studio</span><b>Relance J+2</b><span className="dm-pastille">À valider</span></div>
        <div className={`dm-carte ${vu(3)}`}><span className="dm-offre">Signature</span><b>Relance J+2</b><span className="dm-pastille dm-pastille--minute">Partira dans 7 min</span><span className="dm-lien">Annuler</span></div>
      </div>
      <p className={`dm-bulle dm-bulle--in dm-bulle--petite ${vu(5)}`}>« Bonjour, c’est bon pour nous, on peut caler une date ? »</p>
      <p className={`dm-note ${vu(5)}`}>Le client a répondu : les relances suivantes s’arrêtent.</p>
    </Fenetre>
  )
}

/* 4 · Factures et impayés : le devis accepté devient facture ; une relance d'impayé se prépare ; la facture passe « Payée ». */
function Factures() {
  const f = EXEMPLES.factures
  const { etape, joue, racine, vu } = useScene([500, 900, 1100, 1300, 1400])
  const payee = etape >= 5
  return (
    <Fenetre ecran="factures" racine={racine} joue={joue}>
      <div className="dm-pile">
        <div className={`dm-doc dm-doc--devis${etape >= 3 ? ' est-derriere' : ''}`}>
          <small>Devis D-2026-031</small><b>{f.client}</b><span className="dm-montant">{euros(f.montant)}</span>
          <span className={`dm-tampon ${vu(2)}`}><Coche />Accepté en ligne</span>
        </div>
        <div className={`dm-doc dm-doc--facture ${vu(3)}`}>
          <small>Facture {f.numero}</small><b>{f.client}</b><span className="dm-montant">{euros(f.montant)}</span>
          <span className="dm-mentions">Mentions légales · PDF</span>
          <span className={`dm-tampon dm-tampon--paye ${vu(5)}`}><Coche />Payée</span>
        </div>
      </div>
      <div className={`dm-ligne-etat ${vu(4)}${payee ? ' est-arrete' : ''}`}><span className="dm-pastille dm-pastille--minute">Échue</span><span>Relance d’impayé J+3 prête</span><span className="dm-lien">{payee ? 'Arrêtée' : 'Voir'}</span></div>
      <p className={`dm-note ${vu(5)}`}>Paiement noté : les relances de cette facture s’arrêtent.</p>
    </Fenetre>
  )
}

/* 5 · Inventaire : le stock du camion baisse jusqu'à passer sous le seuil, l'article passe en alerte. */
function Inventaire() {
  const s = EXEMPLES.inventaire
  const paliers = [s.depart, 9, 6, s.seuil + 1, s.fin]
  const { etape, joue, racine, vu } = useScene([600, 700, 700, 700, 900])
  const q = paliers[Math.min(etape, paliers.length - 1)]
  const alerte = q < s.seuil
  return (
    <Fenetre ecran="inventaire" racine={racine} joue={joue}>
      <div className="dm-onglets"><span>Dépôt</span><span className="est-actif">Camion</span></div>
      <ul className="dm-stock">
        <li><span>Gaine ICTA 20 mm</span><b>48 m</b></li>
        <li className={alerte ? 'est-alerte' : ''}>
          <span>{s.article}</span>
          <span className="dm-jauge"><i style={{ transform: `scaleX(${q / s.depart})` }} /><em style={{ left: `${(s.seuil / s.depart) * 100}%` }} /></span>
          <b className="dm-qte">{q} u</b>
        </li>
        <li><span>Colliers de fixation</span><b>120 u</b></li>
      </ul>
      <div className={`dm-alerte ${vu(5)}`}><b>Sous le seuil ({s.seuil} u)</b><span className="dm-bouton dm-bouton--petit">Chercher un prix chez vos fournisseurs</span></div>
      <p className={`dm-note ${vu(1)}`}>Scan au camion : la quantité se met à jour.</p>
    </Fenetre>
  )
}

/* 6 · Assistant : l'artisan écrit, l'assistant lit ses données et prépare le brouillon, qui attend « Confirmer ». */
function Assistant() {
  const a = EXEMPLES.assistant
  const { etape, joue, racine, vu } = useScene([300, 1900, 900, 1100, 1200])
  const tape = useFrappe(a.question, joue && etape === 1)
  return (
    <Fenetre ecran="assistant" racine={racine} joue={joue}>
      <div className="dm-fil">
        <p className={`dm-bulle dm-bulle--out dm-bulle--moi ${vu(2)}`}>{a.question}</p>
        <p className={`dm-lectures ${vu(3)}`}><span>Lit vos tarifs</span><span>Lit vos clients</span></p>
        <p className={`dm-bulle dm-bulle--in ${vu(4)}`}>{a.reponse}</p>
        <div className={`dm-carte dm-carte--brouillon ${vu(5)}`}><small>Brouillon</small><b>Devis · Mme Martin · carrelage 12 m²</b><span className="dm-actions"><span className="dm-bouton dm-bouton--petit">Confirmer</span><span className="dm-lien">Modifier</span></span></div>
      </div>
      <div className="dm-saisie"><span>{etape === 1 ? tape : etape < 1 ? '' : 'Écrivez à l’assistant…'}{etape === 1 ? <i className="dm-curseur" /> : null}</span><span className="dm-envoyer" aria-hidden="true">↑</span></div>
    </Fenetre>
  )
}

/* 7 · CRM : la fiche d'un chantier se remplit : facturé, encaissé, reste à encaisser, marge sur matériaux estimée. */
function Crm() {
  const c = EXEMPLES.crm
  const { etape, joue, racine, vu } = useScene([500, 800, 900, 900, 900])
  const part = (n: number) => `scaleX(${etape >= 2 ? n : 0})`
  return (
    <Fenetre ecran="chantier" racine={racine} joue={joue}>
      <div className="dm-tete dm-tete--doc"><div><small>Chantier</small><b>{c.chantier}</b></div><span className={`dm-etat ${vu(1)}`}>En cours</span></div>
      <ul className="dm-barres">
        <li className={vu(2)}><span>Facturé</span><span className="dm-barre"><i style={{ transform: part(1) }} /></span><b>{euros(c.facture)}</b></li>
        <li className={vu(3)}><span>Encaissé</span><span className="dm-barre dm-barre--ok"><i style={{ transform: part(etape >= 3 ? c.encaisse / c.facture : 0) }} /></span><b>{euros(c.encaisse)}</b></li>
        <li className={vu(4)}><span>Reste à encaisser</span><span className="dm-barre dm-barre--reste"><i style={{ transform: part(etape >= 4 ? (c.facture - c.encaisse) / c.facture : 0) }} /></span><b>{euros(c.facture - c.encaisse)}</b></li>
      </ul>
      <div className={`dm-marge ${vu(5)}`}><span>Marge sur matériaux</span><b>{c.marge} %</b><span className="dm-pastille dm-pastille--minute">Estimée</span></div>
    </Fenetre>
  )
}

const ECRANS: Record<IdDemo, () => React.JSX.Element> = { reponse: Reponse, devis: Devis, relances: Relances, factures: Factures, inventaire: Inventaire, assistant: Assistant, crm: Crm }

export default function Ecran({ id }: { id: IdDemo }) {
  const E = ECRANS[id]
  return <E />
}
