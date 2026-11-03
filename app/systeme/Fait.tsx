'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import Coque, { Lecture, PasEncore, Icone } from './Coque'
import { ResumeFait, lienManuel, nomOutil, nomTypePilote, type CarteBrute } from './Cartes'
import { annulerEnvoi, dateFr, eurCentimes, heureFr, useLecture } from './donnees'

type LigneAuto = { id: string; type: string; libelle: string; prete_le: string; part_le: string; statut: string; motif: string | null; traite_le: string | null }
type Donnees = {
  signature: boolean; offre: 'studio' | 'signature'; nom: string | null; metier: string | null
  file: LigneAuto[]; cartes: CarteBrute[]
  leads: { id: string; nom_prospect: string | null; type_chantier: string | null; canal: string | null; created_at: string }[]
  cout: { disponible: boolean; jourCentimes: number; moisCentimes: number; appelsJour: number; plafondCentimes: number | null; jour: string }
  plafondEnvois: number; delaiMin: number
}
type Periode = 'jour' | 'hier' | 'sept'
const parisJour = (iso: string) => new Date(iso).toLocaleDateString('fr-CA', { timeZone: 'Europe/Paris' })

function Carte({ colonne, type, titre, quand, fait, manuel, journal }: { colonne: string; type: string; titre: string; quand?: string; fait?: React.ReactNode; manuel?: { href: string; libelle: string }; journal?: boolean }) {
  return (
    <article className="tache" data-action={type} data-statut={colonne}>
      <span className="type">{type}</span>
      <p className="titre">{titre}</p>
      {quand ? <p className="quand">{quand}</p> : null}
      {fait}
      <div className="rang">
        {manuel ? <Link className="btn petit" href={manuel.href} data-manuel>{manuel.libelle}</Link> : null}
        {journal ? <Link className="btn petit discret" href="/assistant" data-journal-lien>Voir le détail</Link> : null}
      </div>
    </article>
  )
}

export default function Fait() {
  const { lecture, relire } = useLecture<Donnees>('fait')
  const [periode, setPeriode] = useState<Periode>('jour')
  const [retour, setRetour] = useState('')
  const d = lecture.etat === 'ok' ? lecture.donnees : null
  const maintenant = useMemo(() => Date.now(), [lecture])
  const signature = d?.signature

  const dans = (iso: string) => {
    if (!d) return false
    const j = parisJour(iso), auj = d.cout.jour, hier = parisJour(new Date(maintenant - 86_400_000).toISOString())
    return periode === 'jour' ? j === auj : periode === 'hier' ? j === hier : maintenant - new Date(iso).getTime() <= 7 * 86_400_000
  }
  const enDelai = (d?.file ?? []).filter((f) => f.statut === 'a_partir' || f.statut === 'en_cours')
  const parties = (d?.file ?? []).filter((f) => f.statut === 'partie' && dans(f.traite_le ?? f.prete_le))
  const aValider = (d?.cartes ?? []).filter((c) => c.statut === 'en_attente')
  const prepares = (d?.cartes ?? []).filter((c) => c.mode === 'direct' && c.statut === 'executee' && dans(c.cree_le))
  const confirmees = (d?.cartes ?? []).filter((c) => c.mode === 'confirmation' && c.statut === 'executee' && dans(c.cree_le))
  const reperes = (d?.leads ?? []).filter((l) => dans(l.created_at))
  const envoisJour = (d?.file ?? []).filter((f) => ['a_partir', 'en_cours', 'partie'].includes(f.statut) && parisJour(f.prete_le) === d?.cout.jour).length

  async function annuler(id: string) { const r = await annulerEnvoi(id); setRetour(r.message); relire() }

  return (
    <Coque ecran="fait" aValider={aValider.length || null} signature={d?.signature} nom={d?.nom} metier={d?.metier}>
      {lecture.etat !== 'ok' ? <Lecture etat={lecture.etat} message={lecture.etat === 'erreur' ? lecture.message : undefined} /> : (
        <>
          <p role="status" className="sr">{retour}</p>
          <div className="tete">
            <div>
              <h1>Ce que vos assistants ont fait</h1>
              <p className="sous">Tout ce qui a été repéré, préparé et ce qui est parti. {signature ? `Ce qui part seul attend ${d!.delaiMin} minutes : vous pouvez l’annuler jusque-là.` : 'En Studio, rien ne part sans votre clic.'}</p>
            </div>
            <div className="droite">
              <div className="onglets" role="group" aria-label="Période">
                {([['jour', 'Aujourd’hui'], ['hier', 'Hier'], ['sept', '7 jours']] as const).map(([k, l]) => <button key={k} type="button" aria-pressed={periode === k} onClick={() => setPeriode(k)}>{l}</button>)}
              </div>
              {signature ? <Link className="btn" href="/systeme/departements#general">Tout mettre en pause</Link> : null}
            </div>
          </div>

          <section className="resume" aria-label="Le jour en trois chiffres">
            <div className="carte" data-cout-ia>
              <h2>Coût de l’IA aujourd’hui</h2>
              {d!.cout.disponible ? (<>
                <span className="gros">{eurCentimes(d!.cout.jourCentimes)}{d!.cout.plafondCentimes != null ? <small>sur un plafond de {eurCentimes(d!.cout.plafondCentimes)} par jour</small> : <small>aucun plafond réglé</small>}</span>
                {d!.cout.plafondCentimes ? <div className="jauge" role="img" aria-label={`${Math.round(d!.cout.jourCentimes / d!.cout.plafondCentimes * 100)} % du plafond du jour`}><span style={{ width: `${Math.min(100, d!.cout.jourCentimes / d!.cout.plafondCentimes * 100)}%` }} /></div> : null}
                <p>{d!.cout.appelsJour} texte{d!.cout.appelsJour > 1 ? 's' : ''} rédigé{d!.cout.appelsJour > 1 ? 's' : ''} ou lu{d!.cout.appelsJour > 1 ? 's' : ''} aujourd’hui · <span className="nb">{eurCentimes(d!.cout.moisCentimes)}</span> depuis le 1<sup>er</sup> du mois.</p>
                <span className="source">Compté à chaque appel, sur votre compte seulement.</span>
              </>) : <PasEncore>Le compteur du coût de l’IA n’est pas encore ouvert sur votre compte.</PasEncore>}
            </div>
            <div className="carte">
              <h2>Envois seuls aujourd’hui</h2>
              {signature ? (<>
                <span className="gros" data-plafond>{envoisJour}<small>sur {d!.plafondEnvois} au plus par jour</small></span>
                <div className="jauge" role="img" aria-label={`${envoisJour} envois sur ${d!.plafondEnvois}`}><span style={{ width: `${Math.min(100, envoisJour / d!.plafondEnvois * 100)}%` }} /></div>
                <p>{enDelai.length} en délai. Seuls les types réglés sur « part seul » dans Mes départements.</p>
              </>) : <p className="verrou" data-verrou="offre" data-capacite="assistant.pilote"><Icone nom="cadenas" />Part seul : inclus dans Signature</p>}
            </div>
            <div className="carte">
              <h2>Vous attendent</h2>
              <span className="gros">{aValider.length}<small>à valider</small></span>
              <p>Ce qui est prêt et attend votre feu vert. <Link href="/systeme#a-valider">Voir les cartes</Link></p>
            </div>
          </section>

          {signature && enDelai.length ? (
            <section className="en-delai" aria-label="Part dans quelques minutes">
              <div><h2>Part dans quelques minutes</h2><p>Encore annulable. Passé le délai, il rejoint « Parti ».</p></div>
              {enDelai.map((f) => {
                const reste = Math.max(0, new Date(f.part_le).getTime() - maintenant)
                return (
                  <article key={f.id} className="tache delai bande" data-action={f.type} data-statut="en-delai">
                    <span className="type">{nomTypePilote(f.type)} · part seul</span>
                    <p className="titre">{f.libelle}</p>
                    <div className="depart"><span className="regle" style={{ '--reste': Math.min(1, reste / (d!.delaiMin * 60_000)) } as React.CSSProperties} aria-hidden="true">{Array.from({ length: 10 }, (_, i) => <i key={i} />)}</span><span>part dans <b className="nb">{Math.ceil(reste / 60_000)} min</b></span></div>
                    <div className="rang"><button type="button" className="btn petit corail" aria-label={`Annuler l’envoi : ${f.libelle}`} onClick={() => annuler(f.id)}>Annuler l’envoi</button><Link className="btn petit" href="/assistant" data-manuel>Le faire moi-même</Link></div>
                  </article>
                )
              })}
            </section>
          ) : null}

          <div className="tableau">
            <section className="colonne" data-colonne="repere" aria-labelledby="c-repere">
              <div className="colonne-tete"><h2 id="c-repere">Repéré</h2><span className="compte">{reperes.length}</span><p>lu et rangé</p></div>
              <div className="cartes entre">
                {reperes.length ? reperes.map((l) => <Carte key={l.id} colonne="repere" type="Nouvelle demande" titre={`${l.nom_prospect ?? 'Un prospect'}${l.type_chantier ? ` · ${l.type_chantier}` : ''}`} quand={`${dateFr(l.created_at)} à ${heureFr(l.created_at)}`} fait={<p className="fait">fait : <b>rangée dans vos conversations</b></p>} manuel={{ href: '/assistant', libelle: 'Traiter moi-même' }} />) : <p className="vide">Rien de repéré sur cette période.</p>}
              </div>
            </section>
            <section className="colonne" data-colonne="prepare" aria-labelledby="c-prepare">
              <div className="colonne-tete"><h2 id="c-prepare">Préparé</h2><span className="compte">{prepares.length}</span><p>fait directement</p></div>
              <div className="cartes entre">
                {prepares.length ? prepares.map((c) => <Carte key={c.id} colonne="prepare" type={nomOutil(c.outil)} titre={c.titre} quand={heureFr(c.cree_le)} fait={<ResumeFait c={c} />} manuel={lienManuel(c.outil)} />) : <p className="vide">Rien de préparé sur cette période.</p>}
              </div>
            </section>
            <section className="colonne" data-colonne="a-valider" aria-labelledby="c-valider">
              <div className="colonne-tete"><h2 id="c-valider">À valider</h2><span className="compte">{aValider.length}</span><p>toujours à vous</p></div>
              <div className="cartes entre">
                {aValider.length ? aValider.map((c) => <Carte key={c.id} colonne="a-valider" type={nomOutil(c.outil)} titre={c.titre} fait={<ResumeFait c={c} />} manuel={lienManuel(c.outil)} />) : <p className="vide">Rien n’attend votre feu vert.</p>}
                {aValider.length ? <Link className="btn petit" href="/systeme#a-valider">Valider dans le centre</Link> : null}
              </div>
            </section>
            <section className="colonne" data-colonne="parti" aria-labelledby="c-parti">
              <div className="colonne-tete"><h2 id="c-parti">Parti</h2><span className="compte">{parties.length + confirmees.length}</span><p>avec son journal</p></div>
              <div className="cartes entre">
                {parties.map((f) => <Carte key={f.id} colonne="parti" type={nomTypePilote(f.type)} titre={f.libelle} quand={`partie à ${heureFr(f.traite_le ?? f.prete_le)}`} fait={<p className="fait">fait : <b>parti seul</b> après {d!.delaiMin} minutes d’annulation possible</p>} journal />)}
                {confirmees.map((c) => <Carte key={c.id} colonne="parti" type={nomOutil(c.outil)} titre={c.titre} quand={`validée à ${heureFr(c.cree_le)}`} fait={<ResumeFait c={c} />} journal />)}
                {!parties.length && !confirmees.length ? <p className="vide">Rien n’est parti sur cette période.</p> : null}
              </div>
            </section>
          </div>
          <p className="pied"><Link href="/assistant">Ouvrir le journal complet</Link><span>Chaque ligne du journal dit qui a agi, quand, et ce qui a été écrit.</span></p>
        </>
      )}
    </Coque>
  )
}
