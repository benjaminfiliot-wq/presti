'use client'
import { useState } from 'react'
import Coque, { Lecture, PasEncore } from './Coque'
import { GROUPES_CONNEXIONS, type OutilConnexion } from '../api/systeme/regles'
import { connecterGoogle, dateHeureFr, retirerConnexion, useLecture } from './donnees'

type Connexion = { id: string; fournisseur: string; compte_affiche: string | null; etat: string; motif_erreur: string | null; verifiee_le: string | null; derniere_synchro: string | null; expire_le: string | null }
type Donnees = { signature: boolean; offre: 'studio' | 'signature'; nom: string | null; metier: string | null; disponible: boolean; connexions: Connexion[]; ouvertes: boolean }
const GOOGLE = new Set(['gmail', 'google_agenda', 'google_drive'])

function Il({ iso }: { iso: string }) {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60_000))
  return <>{min < 60 ? `il y a ${min} min` : `le ${dateHeureFr(iso)}`}</>
}

function Ligne({ o, c, ouvertes, relire }: { o: OutilConnexion; c: Connexion | undefined; ouvertes: boolean; relire: () => void }) {
  const [confirme, setConfirme] = useState(false)
  const [retour, setRetour] = useState('')
  // Jamais une fausse donnée : sans ligne en base, l'outil est « non branché » et dit « Connecter ».
  const etat = c?.etat === 'active' ? 'branche' : c && (c.etat === 'expiree' || c.etat === 'erreur') ? 'a-reconnecter' : c ? 'a-verifier' : 'non-branche'
  const libelle = etat === 'branche' ? 'Connecté' : etat === 'a-reconnecter' ? 'À reconnecter' : etat === 'a-verifier' ? 'À vérifier' : o.sms ? 'Depuis votre téléphone' : 'Non branché'
  const classe = etat === 'branche' ? 'ok' : etat === 'a-reconnecter' ? 'erreur' : etat === 'a-verifier' ? 'attente' : 'neutre'
  async function retirer() { const r = await retirerConnexion(c!.id); setRetour(r.message); setConfirme(false); if (r.ok) relire() }
  async function connecter() { const r = await connecterGoogle(o.fournisseur!); if (r.ok && r.url) window.location.assign(r.url); else setRetour(r.message) }
  const peutConnecter = ouvertes && !!o.fournisseur && GOOGLE.has(o.fournisseur)
  return (
    <li className="outil" data-outil={o.id} data-etat={etat}>
      <span className="logo" aria-hidden="true">{o.logo}</span>
      <div>
        <p className="nom">{o.nom} <span className={`etat ${classe}`} data-etat-libelle>{libelle}</span></p>
        <p className="role">{o.role}</p>
        {etat === 'branche' && c ? (
          <p className="meta">
            {c.derniere_synchro ? <span className="synchro">Dernière synchronisation <Il iso={c.derniere_synchro} /></span> : null}
            {c.verifiee_le ? <span className="verifie">Vérifié le {dateHeureFr(c.verifiee_le)} · lecture réussie</span> : null}
          </p>
        ) : null}
        {etat === 'a-reconnecter' && c ? <p className="meta"><span>{c.expire_le ? `Autorisation expirée le ${dateHeureFr(c.expire_le)}` : 'La dernière lecture a échoué'}</span></p> : null}
      </div>
      <div className="geste">
        {etat === 'branche' || etat === 'a-reconnecter' || etat === 'a-verifier' ? (<>
          {etat === 'a-reconnecter' ? <button type="button" className="btn petit plein" aria-label={`Reconnecter ${o.nom}`} disabled={!peutConnecter} aria-disabled={!peutConnecter} onClick={connecter}>Reconnecter</button> : null}
          <button type="button" className={`btn petit${etat === 'a-reconnecter' ? ' discret' : ''}`} aria-label={`Retirer ${o.nom}`} aria-expanded={confirme} aria-controls={`conf-${o.id}`} onClick={() => setConfirme(true)}>Retirer</button>
        </>) : o.sms
          ? <button type="button" className="btn petit" aria-disabled="true" disabled>Connecter l’envoi automatique</button>
          : <button type="button" className="btn petit plein" aria-label={`Connecter ${o.nom}`} disabled={!peutConnecter} aria-disabled={!peutConnecter} onClick={connecter}>Connecter</button>}
      </div>
      {confirme && c ? (
        <div className="confirmer" id={`conf-${o.id}`} role="group" aria-label={`Confirmer le retrait de ${o.nom}`}>
          <p>Retirer {o.nom} ? Votre autorisation est effacée tout de suite. Rien n’est supprimé chez {o.nom}.</p>
          <button type="button" className="btn petit corail" onClick={retirer}>Retirer l’accès</button>
          <button type="button" className="btn petit discret" onClick={() => setConfirme(false)}>Garder</button>
        </div>
      ) : null}
      {etat === 'a-reconnecter' ? <p className="note">Le travail qui dépend de cet outil est en pause. Rien n’est perdu : il reprendra dès la reconnexion.</p> : null}
      {o.note && etat === 'non-branche' ? <p className="note">{o.note}</p> : null}
      {retour ? <p className="note" role="status">{retour}</p> : null}
    </li>
  )
}

export default function Connexions() {
  const { lecture, relire } = useLecture<Donnees>('connexions')
  const d = lecture.etat === 'ok' ? lecture.donnees : null
  const par = new Map((d?.connexions ?? []).map((c) => [c.fournisseur, c]))
  const tous = GROUPES_CONNEXIONS.flatMap((g) => g.outils)
  const branches = tous.filter((o) => o.fournisseur && par.get(o.fournisseur)?.etat === 'active').length
  const arec = tous.filter((o) => { const e = o.fournisseur ? par.get(o.fournisseur)?.etat : null; return e === 'expiree' || e === 'erreur' }).length
  return (
    <Coque ecran="connexions" signature={d?.signature} nom={d?.nom} metier={d?.metier}>
      {lecture.etat !== 'ok' ? <Lecture etat={lecture.etat} message={lecture.etat === 'erreur' ? lecture.message : undefined} /> : (
        <div className="page">
          <div className="tete"><div><h1>Connexions</h1><p className="sous">Les outils que vous utilisez déjà. Vos assistants y lisent et y préparent le travail ; chaque message arrive dans votre conversation client.</p></div></div>
          <div className="etat-general"><span className="etat ok">{branches} connecté{branches > 1 ? 's' : ''} et vérifié{branches > 1 ? 's' : ''}</span>{arec ? <span className="etat erreur">{arec} à reconnecter</span> : null}<span className="etat neutre">{tous.length - branches - arec} disponible{tous.length - branches - arec > 1 ? 's' : ''}</span></div>
          <p className="promesse">Une connexion n’est dite « vérifiée » qu’après une vraie lecture réussie. Vos autorisations sont chiffrées ; « Retirer » coupe l’accès tout de suite et efface l’autorisation.</p>
          {!d!.disponible ? <PasEncore>Les connexions ne sont pas encore ouvertes sur votre compte : chaque outil dit « Connecter » et n’affiche aucune date.</PasEncore> : null}
          {!d!.ouvertes ? <PasEncore>La connexion d’un nouvel outil s’ouvre bientôt. La liste ci-dessous est celle des outils prévus.</PasEncore> : null}
          {GROUPES_CONNEXIONS.map((g) => (
            <section key={g.id} className="groupe" aria-labelledby={`g-${g.id}`}>
              <h2 id={`g-${g.id}`}>{g.titre}</h2>
              <ul className="liste carte entre">{g.outils.map((o) => <Ligne key={o.id} o={o} c={o.fournisseur ? par.get(o.fournisseur) : undefined} ouvertes={d!.ouvertes} relire={relire} />)}</ul>
            </section>
          ))}
        </div>
      )}
    </Coque>
  )
}
