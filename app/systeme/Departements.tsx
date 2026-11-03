'use client'
import Coque, { Lecture, PasEncore, Icone } from './Coque'
import { DEPARTEMENTS, verrouDe, type TypeTravail } from '../api/systeme/regles'
import { useLecture } from './donnees'

type Reglage = { departement: string; palier: string; en_marche: boolean; plafond_jour: number | null }
type Donnees = {
  signature: boolean; offre: 'studio' | 'signature'; plan: string | null; nom: string | null; metier: string | null; disponible: boolean
  reglages: Reglage[]; enviJourParType: Record<string, number>; envoisJour: number; plafondEnvois: number; delaiMin: number
}

// « Mes départements » : tout est LU. Le palier et l'interrupteur se posent par la mise en service du compte (palier « ombre » puis
// « réel », jamais depuis un écran) ; ici ils s'affichent, désactivés. Le verrou d'offre vient de peut() (api/systeme/regles.ts).
function Interrupteur({ marche, libelle }: { marche: boolean; libelle: string }) {
  return <button className="interrupteur" type="button" role="switch" aria-checked={marche} disabled data-interrupteur><span className="sr">{libelle}</span></button>
}

function Type({ t, d, tous, parType }: { t: TypeTravail; d: Donnees; tous: Reglage | undefined; parType: Record<string, number> }) {
  const verrou = verrouDe(d.plan, t)
  const reg = d.reglages.find((r) => r.departement === DEPARTEMENTS.find((x) => x.types.includes(t))?.id)
  const partSeul = verrou === 'libre' && !!reg?.en_marche && !!tous?.en_marche && (reg.palier === 'ombre' || reg.palier === 'reel') && (tous.palier === 'ombre' || tous.palier === 'reel')
  const fait = t.typePilote ? parType[t.typePilote] ?? 0 : 0
  return (
    <li className="type" data-type={t.id}>
      <div className="type-texte"><p className="nom">{t.nom}</p><p className="detail">{t.detail}</p></div>
      <div className="type-mode">
        {verrou === 'toujours' ? null : (
          <div className="seg" role="group" aria-label={`Mode pour ${t.nom}`}>
            <button type="button" data-mode="a-valider" aria-pressed={!partSeul} disabled>À valider</button>
            <button type="button" data-mode="part-seul" aria-pressed={partSeul} disabled>Part seul</button>
          </div>
        )}
      </div>
      <div className="type-info">
        {verrou === 'toujours' ? <span className="verrou" data-verrou="jamais">Toujours à vous</span>
          : verrou === 'bientot' ? <span className="verrou" data-verrou="bientot">Bientôt, après essais</span>
            : verrou === 'offre' ? <span className="verrou" data-verrou="offre" data-capacite={t.capacite}><Icone nom="cadenas" />Part seul : inclus dans Signature</span>
              : <span className="plafond"><span className="nb">{fait}{reg?.plafond_jour != null ? ` sur ${reg.plafond_jour}` : ''}</span> aujourd’hui</span>}
      </div>
    </li>
  )
}

export default function Departements() {
  const { lecture } = useLecture<Donnees>('departements')
  const d = lecture.etat === 'ok' ? lecture.donnees : null
  const tous = d?.reglages.find((r) => r.departement === 'tous')
  const signature = d?.signature
  return (
    <Coque ecran="departements" signature={d?.signature} nom={d?.nom} metier={d?.metier}>
      {lecture.etat !== 'ok' ? <Lecture etat={lecture.etat} message={lecture.etat === 'erreur' ? lecture.message : undefined} /> : (
        <div className="page">
          <div className="tete"><div><h1>Mes départements</h1><p className="sous">Pour chaque type de travail, choisissez : vous validez, ou il part seul. Ce qui part seul attend {d!.delaiMin} minutes et reste dans « Ce que vos assistants ont fait ».</p></div></div>
          {!d!.disponible ? <PasEncore>Vos réglages ne sont pas encore posés : chaque département est en simulation et tout reste « à valider ».</PasEncore> : null}
          <section className="vue" id="general" aria-label={signature ? 'Vue Signature' : 'Vue Studio'}>
            {signature ? (
              <div className="carte reglages">
                <div className="reglage"><div><p className="nom">Envois seuls</p><p className="detail">Coupez ici et tout repasse en « à valider », tout de suite.</p></div><Interrupteur marche={!!tous?.en_marche} libelle="Envois seuls" /></div>
                <div className="reglage"><div><p className="nom">Plafond du jour</p><p className="detail">Au-delà, ce qui reste attend demain ou votre clic. Aujourd’hui : <span className="nb">{d!.envoisJour}</span> envois.</p></div><span className="chiffre-reglage" data-plafond><b className="mono">{tous?.plafond_jour ?? d!.plafondEnvois}</b> par jour</span></div>
                <div className="reglage"><div><p className="nom">Délai pour annuler</p><p className="detail">Tout ce qui part seul attend avant de partir.</p></div><span className="chiffre-reglage"><b className="mono">{d!.delaiMin}</b> minutes</span></div>
              </div>
            ) : (
              <div className="carte reglages studio-bandeau"><div className="reglage"><div><p className="nom">En Studio, rien ne part sans votre clic</p><p className="detail">Vos assistants préparent tout, comme en Signature. Chaque envoi attend votre feu vert dans « À valider ».</p></div></div></div>
            )}
            {DEPARTEMENTS.map((dep) => {
              const reg = d!.reglages.find((r) => r.departement === dep.id)
              return (
                <article key={dep.id} className="carte departement" data-departement={dep.id}>
                  <header className="dep-tete"><div><h2>{dep.titre}</h2><p>{dep.role}</p></div><Interrupteur marche={!!reg?.en_marche} libelle={dep.titre} /></header>
                  <ul className="types">
                    {dep.types.map((t) => <Type key={t.id} t={t} d={d!} tous={tous} parType={d!.enviJourParType} />)}
                    {dep.interne?.map((i) => (
                      <li key={i.id} className="type" data-tache-interne={i.id}><div className="type-texte"><p className="nom">{i.nom}</p><p className="detail">{i.detail}</p></div><div className="type-mode" /><div className="type-info"><span className="verrou" data-verrou="interne">Pour vous seul</span></div></li>
                    ))}
                  </ul>
                </article>
              )
            })}
            <p className="source">Ces réglages se lisent ici ; ils se posent avec la mise en service de votre compte, département par département.</p>
          </section>
        </div>
      )}
    </Coque>
  )
}
