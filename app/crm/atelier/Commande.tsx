'use client'

import { useMemo, useState } from 'react'
import { preparerCommande, texteCommande, type DonneesAtelier } from '@/lib/crm/atelier'
import { adresseMail, enCours, LIBELLES_STATUT_COMMANDE, libelleCommande, retardLivraison, telephone, texteRelance, type CommandeA } from '@/lib/crm/commandes'
import { appel, dateFr, enCentimes, estErreur, euros } from '../client'

// La commande fournisseur dans le panneau de l'atelier — TROIS pièces, toutes sur la donnée de la base (table commandes_fournisseur) :
//   • EnregistrerCommande : « J'ai passé cette commande » (liste préparée → ligne enregistrée avec la date de livraison annoncée).
//     Presti ne commande rien : l'artisan dit ce qu'il a commandé, et c'est ce qui permet de dire « livraison en retard » ensuite ;
//   • FicheCommande      : « Ouvrir la commande » — lignes, dates, relances, reçue (avec entrée en stock), nouvelle date, annulation ;
//   • DialogueRelance    : « Relancer le fournisseur » — le message est PRÉPARÉ, relu, modifiable ; l'e-mail ne part qu'au clic sur
//     « Envoyer l'e-mail à … » (la route exige `confirmer: true`). Sans adresse e-mail : copie du message, jamais d'envoi.

type Info = { texte: string; erreur: boolean } | null
const qte = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')

// ── Préparer, puis enregistrer ───────────────────────────────────────────────────────────────────────────────
export function PreparerCommande({ donnees, materiaux, onChange }: { donnees: DonneesAtelier; materiaux: DonneesAtelier['materiaux']; onChange: () => void }) {
  const dejaCommandes = useMemo(() => new Set(enCours(donnees.commandes ?? []).flatMap((c) => c.lignes.map((l) => l.materiau_id).filter(Boolean))), [donnees.commandes])
  const aCommander = useMemo(() => materiaux.filter((m) => !dejaCommandes.has(m.id)), [materiaux, dejaCommandes])
  const commandes = useMemo(() => preparerCommande(aCommander, donnees.jour), [aCommander, donnees.jour])
  const [qtes, setQtes] = useState<Record<string, number>>({})
  const [copie, setCopie] = useState<string | null>(null)
  const retenues = materiaux.length - aCommander.length
  return (
    <div className="atl-commande" aria-label="Commande préparée">
      {retenues > 0 && <p className="crm-note">{retenues} matériau{retenues > 1 ? 'x sont' : ' est'} déjà en commande : {retenues > 1 ? 'ils ne sont' : 'il n’est'} pas proposé{retenues > 1 ? 's' : ''} une seconde fois.</p>}
      {commandes.length === 0 ? <p className="crm-vide">Tout ce qui est sous le seuil est déjà commandé.</p> : (
        <p className="crm-note">Quantités proposées : de quoi revenir au double du seuil. Changez-les, copiez le texte pour votre fournisseur, puis enregistrez la commande une fois passée : rien n’est envoyé d’ici.</p>
      )}
      {commandes.map((c) => (
        <FormulaireCommande key={c.fournisseur} donnees={donnees} c={c} qtes={qtes} setQtes={setQtes} copie={copie} setCopie={setCopie} onChange={onChange} />
      ))}
    </div>
  )
}

function FormulaireCommande({ donnees, c, qtes, setQtes, copie, setCopie, onChange }: {
  donnees: DonneesAtelier; c: ReturnType<typeof preparerCommande>[number]
  qtes: Record<string, number>; setQtes: (q: Record<string, number>) => void; copie: string | null; setCopie: (f: string | null) => void; onChange: () => void
}) {
  const aChoisir = c.fournisseur === 'Fournisseur à choisir'
  const [nom, setNom] = useState('')
  const [livraison, setLivraison] = useState('')
  const [reference, setReference] = useState('')
  const [info, setInfo] = useState<Info>(null)
  const [envoi, setEnvoi] = useState(false)
  const texte = texteCommande(c, qtes, null)
  const mail = adresseMail(c.contact)
  const fournisseur = aChoisir ? nom.trim() : c.fournisseur
  const pret = !!fournisseur && /^\d{4}-\d{2}-\d{2}$/.test(livraison) && livraison >= donnees.jour
  async function enregistrer() {
    setEnvoi(true); setInfo(null)
    const r = await appel('/api/crm/commandes', {
      method: 'POST',
      body: {
        fournisseur, contact: c.contact ?? undefined, reference: reference.trim() || undefined, livraison_prevue: livraison,
        lignes: c.lignes.map((l) => ({ materiau_id: l.materiau_id, nom: l.nom, quantite: qtes[l.materiau_id] ?? l.quantite, unite: l.unite })),
      },
    })
    setEnvoi(false)
    if (!r.ok) { setInfo({ texte: r.erreur, erreur: estErreur(r) }); return }
    setInfo({ texte: `Commande enregistrée : elle sera suivie, et signalée en retard si elle n’arrive pas le ${dateFr(livraison)}.`, erreur: false })
    onChange()
  }
  return (
    <section className="atl-commande-f">
      <h3>{c.fournisseur}</h3>
      <ul>
        {c.lignes.map((l) => (
          <li key={l.materiau_id}>
            <label>
              <span>{l.nom} <span className="muted">(reste {qte(l.reste)} {l.unite})</span></span>
              <input type="number" min={1} step={1} inputMode="numeric" aria-label={`Quantité de ${l.nom}`} value={qtes[l.materiau_id] ?? l.quantite}
                onChange={(e) => setQtes({ ...qtes, [l.materiau_id]: Math.max(1, Math.round(Number(e.target.value) || 1)) })} />
              <span className="muted">{l.unite}</span>
            </label>
            {l.prix_vu_ht !== null && <small className="muted">Prix vu {euros(enCentimes(l.prix_vu_ht))} HT le {dateFr(l.prix_vu_le)}{l.prixAVerifier ? ' — à revérifier' : ''}</small>}
          </li>
        ))}
      </ul>
      <div className="crm-boutons">
        <button type="button" className="psh-btn ghost" onClick={() => { void navigator.clipboard?.writeText(texte).then(() => setCopie(c.fournisseur), () => setCopie(null)) }}>Copier la commande</button>
        {mail && <a className="psh-btn ghost" href={`mailto:${mail}?subject=${encodeURIComponent('Commande')}&body=${encodeURIComponent(texte)}`}>Ouvrir dans ma messagerie</a>}
      </div>
      {copie === c.fournisseur && <p className="crm-message" role="status">Commande copiée. Collez-la dans votre e-mail ou votre espace fournisseur.</p>}
      <fieldset className="atl-enregistrer">
        <legend>Une fois la commande passée</legend>
        {aChoisir && <label>Fournisseur<input type="text" value={nom} maxLength={120} onChange={(e) => setNom(e.target.value)} placeholder="Nom du fournisseur" /></label>}
        <label>Livraison annoncée le<input type="date" value={livraison} min={donnees.jour} onChange={(e) => setLivraison(e.target.value)} /></label>
        <label>Référence (facultatif)<input type="text" value={reference} maxLength={60} onChange={(e) => setReference(e.target.value)} placeholder="N° de commande" /></label>
        <button type="button" className="psh-btn primary" disabled={!pret || envoi} onClick={() => void enregistrer()}>{envoi ? 'Enregistrement…' : 'J’ai passé cette commande'}</button>
      </fieldset>
      {info && <p className={`crm-message${info.erreur ? ' erreur' : ''}`} role="status">{info.texte}</p>}
    </section>
  )
}

// ── « Ouvrir la commande » ───────────────────────────────────────────────────────────────────────────────────
export function FicheCommande({ commande: c, donnees, onChange, onRelancer }: { commande: CommandeA; donnees: DonneesAtelier; onChange: () => void; onRelancer: () => void }) {
  const retard = retardLivraison(c, donnees.jour)
  const chantier = donnees.chantiers.find((x) => x.id === c.chantier_id)
  const [stock, setStock] = useState(c.lignes.some((l) => l.materiau_id))
  const [date, setDate] = useState(c.livraison_prevue)
  const [confirmer, setConfirmer] = useState(false)
  const [info, setInfo] = useState<Info>(null)
  const [occupe, setOccupe] = useState(false)
  async function modifier(corps: Record<string, unknown>, ok: string) {
    setOccupe(true); setInfo(null)
    const r = await appel<{ stock?: { entrees: number; echecs: string[] } }>(`/api/crm/commandes/${c.id}`, { method: 'PATCH', body: corps })
    setOccupe(false)
    if (!r.ok) { setInfo({ texte: r.erreur, erreur: estErreur(r) }); return }
    const echecs = r.corps.stock?.echecs ?? []
    setInfo(echecs.length ? { texte: `Commande reçue, mais l’entrée en stock a échoué pour : ${echecs.join(', ')}. Faites-la depuis l’Inventaire.`, erreur: true } : { texte: ok, erreur: false })
    onChange()
  }
  return (
    <div className="atl-commande-fiche" aria-label={`Commande ${libelleCommande(c)}`}>
      <p className={`atl-statut${retard > 0 ? ' retard' : ''}`}>
        <b>{LIBELLES_STATUT_COMMANDE[c.statut]}</b>
        {c.statut === 'commandee' && (retard > 0 ? ` · en retard de ${retard} jour${retard > 1 ? 's' : ''}` : c.livraison_prevue === donnees.jour ? ' · attendue aujourd’hui' : ` · attendue le ${dateFr(c.livraison_prevue)}`)}
      </p>
      <dl className="atl-dl">
        <dt>Fournisseur</dt><dd>{c.fournisseur}</dd>
        {c.reference && <><dt>Référence</dt><dd>{c.reference}</dd></>}
        <dt>Commandée le</dt><dd>{dateFr(c.commandee_le)}</dd>
        <dt>Livraison annoncée</dt><dd>{dateFr(c.livraison_prevue)}</dd>
        {chantier && <><dt>Pour le chantier</dt><dd>{chantier.titre}</dd></>}
        <dt>Relances</dt><dd>{c.relances ? `${c.relances} (dernière le ${dateFr(c.relance_le)})` : 'Aucune'}</dd>
        {c.contact && <><dt>Contact</dt><dd>{c.contact}</dd></>}
      </dl>
      <ul className="atl-liste">
        {c.lignes.map((l, i) => <li key={`${l.nom}-${i}`}><span>{l.nom}</span><span className="tnum atl-qte">{qte(l.quantite)} {l.unite}</span></li>)}
      </ul>
      {c.statut === 'commandee' && (
        <>
          <div className="crm-boutons">
            <button type="button" className="psh-btn primary" onClick={onRelancer}>Relancer le fournisseur</button>
          </div>
          <fieldset className="atl-enregistrer">
            <legend>La marchandise est arrivée</legend>
            {c.lignes.some((l) => l.materiau_id) && <label className="atl-case"><input type="checkbox" checked={stock} onChange={(e) => setStock(e.target.checked)} />Entrer les quantités dans l’inventaire</label>}
            <button type="button" className="psh-btn ghost" disabled={occupe} onClick={() => void modifier({ action: 'recue', entrer_en_stock: stock }, stock ? 'Commande reçue, quantités entrées en stock.' : 'Commande marquée reçue.')}>Marquer comme reçue</button>
          </fieldset>
          <fieldset className="atl-enregistrer">
            <legend>Nouvelle date annoncée</legend>
            <label>Livraison le<input type="date" value={date} min={c.commandee_le} onChange={(e) => setDate(e.target.value)} /></label>
            <button type="button" className="psh-btn ghost" disabled={occupe || !date || date === c.livraison_prevue} onClick={() => void modifier({ livraison_prevue: date }, 'Nouvelle date enregistrée.')}>Enregistrer la date</button>
          </fieldset>
          {confirmer ? (
            <div className="crm-boutons">
              <button type="button" className="psh-btn ghost" disabled={occupe} onClick={() => void modifier({ action: 'annuler' }, 'Commande annulée.')}>Oui, annuler cette commande</button>
              <button type="button" className="psh-btn ghost" onClick={() => setConfirmer(false)}>Non, la garder</button>
            </div>
          ) : <button type="button" className="atl-lien-bouton" onClick={() => setConfirmer(true)}>Annuler la commande…</button>}
        </>
      )}
      {info && <p className={`crm-message${info.erreur ? ' erreur' : ''}`} role="status">{info.texte}</p>}
    </div>
  )
}

// ── « Relancer le fournisseur » : message relu, envoi confirmé ───────────────────────────────────────────────
export function DialogueRelance({ commande: c, jour, signature, onFermer, onChange }: { commande: CommandeA; jour: string; signature: string | null; onFermer: () => void; onChange: () => void }) {
  const [message, setMessage] = useState(() => texteRelance(c, jour, signature))
  const [info, setInfo] = useState<Info>(null)
  const [envoi, setEnvoi] = useState(false)
  const [fait, setFait] = useState(false)
  const mail = adresseMail(c.contact)
  const tel = telephone(c.contact)
  const deja = c.relance_le && Date.now() - Date.parse(c.relance_le) < 3_600_000
  async function envoyer() {
    setEnvoi(true); setInfo(null)
    const r = await appel<{ envoye_a: string }>(`/api/crm/commandes/${c.id}/relancer`, { method: 'POST', body: { message, confirmer: true } })
    setEnvoi(false)
    if (!r.ok) { setInfo({ texte: r.erreur, erreur: estErreur(r) }); return }
    setFait(true); setInfo({ texte: `E-mail envoyé à ${r.corps.envoye_a}. Le fournisseur vous répondra directement.`, erreur: false })
    onChange()
  }
  return (
    <div className="atl-relance" role="group" aria-label={`Relancer ${c.fournisseur}`}>
      <h3>Relancer {c.fournisseur}</h3>
      {mail ? <p className="crm-note">Destinataire : <b>{mail}</b>. Relisez le message : il ne part que lorsque vous cliquez sur « Envoyer ».</p>
        : <p className="crm-note">Aucune adresse e-mail enregistrée pour ce fournisseur : copiez le message et envoyez-le par votre moyen habituel{tel ? <> — ou appelez le <a href={`tel:${tel.replace(/[^\d+]/g, '')}`}>{tel}</a></> : ''}.</p>}
      <label className="crm-sr" htmlFor={`relance-${c.id}`}>Message de relance</label>
      <textarea id={`relance-${c.id}`} className="atl-texte" rows={9} value={message} maxLength={2000} onChange={(e) => setMessage(e.target.value)} disabled={fait} />
      {deja && !fait && <p className="crm-note">Ce fournisseur a déjà été relancé il y a moins d’une heure.</p>}
      <div className="crm-boutons">
        {mail && <button type="button" className="psh-btn primary" disabled={envoi || fait || !message.trim()} onClick={() => void envoyer()}>{envoi ? 'Envoi…' : `Envoyer l’e-mail à ${mail}`}</button>}
        <button type="button" className="psh-btn ghost" onClick={() => { void navigator.clipboard?.writeText(message).then(() => setInfo({ texte: 'Message copié.', erreur: false }), () => setInfo({ texte: 'Copie impossible : sélectionnez le texte à la main.', erreur: true })) }}>Copier le message</button>
        <button type="button" className="psh-btn ghost" onClick={onFermer}>{fait ? 'Fermer' : 'Annuler'}</button>
      </div>
      {info && <p className={`crm-message${info.erreur ? ' erreur' : ''}`} role="status">{info.texte}</p>}
    </div>
  )
}

