'use client'

import { useEffect, useMemo, useState } from 'react'
import { decaler, planning, type Barre } from '@/lib/crm/planning'
import { ajouterJours } from '@/lib/crm/rappels'
import { LIBELLES_RAPPEL, type Rappel, type TypeRappel } from '@/lib/crm/rappels'
import type { DonneesAtelier } from '@/lib/crm/atelier'
import { appel, dateFr, estErreur } from './client'
import { Lien, useExemple } from './mode'

// Le PLANNING de la semaine (plan du 18/10, n°6) : 7 jours, une ligne par membre et par véhicule, les chantiers en barres, les
// rendez-vous et rappels en épingles, et les CONFLITS (lib/crm/planning.ts, module pur — les mêmes lignes que l'atelier et les
// fiches). Sur téléphone : la liste « Aujourd'hui / Demain / la semaine ». Décaler un chantier passe par la modification EXISTANTE
// des dates (PATCH /api/crm/chantiers/[id]). « Abonner mon agenda » : un lien privé (POST /api/crm/agenda), montré une seule fois.
const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
type Message = { texte: string; erreur: boolean } | null

export default function PlanningVue({ atelier, rappels, jour, onChange }: { atelier: DonneesAtelier; rappels: readonly Rappel[]; jour: string; onChange: () => void | Promise<void> }) {
  const exemple = useExemple()
  const [decal, setDecal] = useState(0)
  const [ouverte, setOuverte] = useState<string | null>(null)
  const [message, setMessage] = useState<Message>(null)
  const debut = ajouterJours(jour, decal * 7)
  const pl = useMemo(() => planning({
    jour: debut,
    chantiers: atelier.chantiers.map((c) => ({ id: c.id, titre: c.titre, statut: c.statut, date_debut: c.date_debut, date_fin_prevue: c.date_fin_prevue, vehicule_id: c.vehicule_id, equipe: c.equipe, client: c.client })),
    membres: atelier.membres, vehicules: atelier.vehicules,
    rappels: rappels.map((r) => ({ id: r.id, type: r.type, echeance: r.echeance, heure: r.heure, texte: r.texte, fait_le: r.fait_le, cible: { libelle: r.cible.libelle, href: r.cible.href } })),
  }), [atelier, rappels, debut])

  async function deplacer(chantierId: string, n: number) {
    const c = atelier.chantiers.find((x) => x.id === chantierId)
    const d = c ? decaler(c, n) : null
    if (!c || !d) return
    setMessage(null)
    const r = await appel(`/api/crm/chantiers/${chantierId}`, { method: 'PATCH', body: d })
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    setMessage({ texte: `« ${c.titre} » décalé : du ${dateFr(d.date_debut)}${d.date_fin_prevue ? ` au ${dateFr(d.date_fin_prevue)}` : ''}.`, erreur: false })
    await onChange()
  }
  const titreSemaine = `Semaine du ${dateFr(pl.jours[0])} au ${dateFr(pl.jours[6])}`
  const duJour = (j: string) => atelier.chantiers.filter((c) => c.statut !== 'termine' && c.statut !== 'annule' && c.date_debut && c.date_debut <= j && (c.date_fin_prevue ?? c.date_debut) >= j)

  return (
    <div className="crm-planning">
      {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
      <div className="crm-planning-barre">
        <button type="button" className="psh-btn ghost" onClick={() => setDecal(decal - 1)} aria-label="Semaine précédente">←</button>
        <h2>{titreSemaine}</h2>
        <button type="button" className="psh-btn ghost" onClick={() => setDecal(decal + 1)} aria-label="Semaine suivante">→</button>
        {decal !== 0 && <button type="button" className="psh-btn ghost" onClick={() => setDecal(0)}>Cette semaine</button>}
      </div>

      {(pl.conflits.length > 0 || pl.sansDate.length > 0) && (
        <section className="psh-panel crm-conflits" aria-labelledby="crm-conflits">
          <header><h2 id="crm-conflits">À vérifier</h2><span className="tag tnum">{pl.conflits.length + pl.sansDate.length}</span></header>
          <ul className="crm-corps crm-liste">
            {pl.conflits.map((c) => (
              <li key={`${c.type}:${c.id}:${c.chantiers.join(':')}`}><span><b>{c.nom}</b> {c.type === 'membre' ? 'est prévu' : 'est réservé'} sur deux chantiers à la fois : « {c.titres[0]} » et « {c.titres[1]} »</span><span className="pill crit tnum">{c.du === c.au ? dateFr(c.du) : `${dateFr(c.du).slice(0, 5)} → ${dateFr(c.au).slice(0, 5)}`}</span></li>
            ))}
            {pl.sansDate.map((c) => <li key={c.id}><span><Lien href={`/crm/chantiers/${c.id}`}>{c.titre}</Lien> : chantier ouvert sans date de début</span><span className="pill warn">Sans date</span></li>)}
          </ul>
        </section>
      )}

      {/* Bureau : la grille de la semaine. */}
      <div className="crm-planning-grille" role="table" aria-label={titreSemaine}>
        <div role="row" className="crm-pl-ligne crm-pl-entete">
          <span role="columnheader" className="crm-pl-nom">Équipe et véhicules</span>
          {pl.jours.map((j, i) => <span key={j} role="columnheader" className={`crm-pl-jour${j === jour ? ' auj' : ''}`}>{JOURS[i]} {dateFr(j).slice(0, 5)}</span>)}
        </div>
        <div role="row" className="crm-pl-ligne crm-pl-epingles">
          <span role="rowheader" className="crm-pl-nom">Rendez-vous et rappels</span>
          {pl.epingles.map((l, i) => (
            <span key={i} role="cell" className="crm-pl-cellule">{l.map((r) => <span key={r.id} className={`crm-pl-epingle t-${r.type}`} title={`${LIBELLES_RAPPEL[r.type as TypeRappel] ?? 'Rappel'} — ${r.cible.libelle}${r.texte ? ` : ${r.texte}` : ''}`}>{r.heure ? `${r.heure.slice(0, 5)} ` : ''}{LIBELLES_RAPPEL[r.type as TypeRappel] ?? 'Rappel'}</span>)}</span>
          ))}
        </div>
        {pl.lignes.length === 0 && <p className="crm-vide">Ajoutez votre équipe et vos véhicules (onglet « Équipe & véhicules ») pour voir qui est où.</p>}
        {pl.lignes.map((l) => (
          <div key={`${l.type}:${l.id}`} role="row" className={`crm-pl-ligne t-${l.type}`}>
            <span role="rowheader" className="crm-pl-nom">{l.type === 'vehicule' ? '🚐 ' : ''}{l.nom}</span>
            <div className="crm-pl-piste" role="cell">
              {l.barres.length === 0 && <span className="crm-pl-libre">Libre</span>}
              {l.barres.map((b) => <BarreVue key={b.chantierId} b={b} ligne={l.id} ouverte={ouverte} setOuverte={setOuverte} deplacer={deplacer} exemple={exemple} />)}
            </div>
          </div>
        ))}
      </div>

      {/* Téléphone : la liste des jours. */}
      <ol className="crm-planning-liste" aria-label={titreSemaine}>
        {pl.jours.map((j) => {
          const cs = duJour(j), rs = pl.epingles[pl.jours.indexOf(j)]
          return (
            <li key={j} className={j === jour ? 'auj' : ''}>
              <h3>{j === jour ? 'Aujourd’hui' : j === ajouterJours(jour, 1) ? 'Demain' : `${JOURS[pl.jours.indexOf(j)]} ${dateFr(j).slice(0, 5)}`}</h3>
              {!cs.length && !rs.length ? <p className="crm-vide">Rien de prévu.</p> : (
                <ul>
                  {rs.map((r) => <li key={r.id} className="crm-pl-rdv">{r.heure ? `${r.heure.slice(0, 5)} · ` : ''}{LIBELLES_RAPPEL[r.type as TypeRappel] ?? 'Rappel'} — {r.cible.libelle}</li>)}
                  {cs.map((c) => {
                    const qui = atelier.membres.filter((m) => c.equipe.includes(m.id)).map((m) => m.nom)
                    const vh = atelier.vehicules.find((v) => v.id === c.vehicule_id)?.nom
                    const conflit = pl.conflits.some((x) => x.chantiers.includes(c.id) && x.du <= j && x.au >= j)
                    return <li key={c.id} className={conflit ? 'conflit' : ''}><Lien href={`/crm/chantiers/${c.id}`}>{c.titre}</Lien><span className="muted">{[qui.join(', '), vh].filter(Boolean).join(' · ') || 'Personne d’affecté'}{conflit ? ' · conflit' : ''}</span></li>
                  })}
                </ul>
              )}
            </li>
          )
        })}
      </ol>

      <AbonnerAgenda exemple={exemple} />
    </div>
  )
}

function BarreVue({ b, ligne, ouverte, setOuverte, deplacer, exemple }: { b: Barre; ligne: string; ouverte: string | null; setOuverte: (x: string | null) => void; deplacer: (id: string, n: number) => void; exemple: boolean }) {
  const cle = `${ligne}:${b.chantierId}`
  return (
    <div className={`crm-pl-barre s-${b.statut}${b.conflit ? ' conflit' : ''}${b.avant ? ' avant' : ''}${b.apres ? ' apres' : ''}`} style={{ gridColumn: `${b.debut + 1} / ${b.fin + 2}` }}>
      <button type="button" aria-expanded={ouverte === cle} onClick={() => setOuverte(ouverte === cle ? null : cle)} title={`${b.titre}${b.sansFin ? ' (fin prévue non renseignée)' : ''}${b.conflit ? ' — conflit' : ''}`}>
        {b.conflit ? '⚠ ' : ''}{b.titre}
      </button>
      {ouverte === cle && (
        <div className="crm-pl-actions">
          <Lien className="psh-btn ghost" href={`/crm/chantiers/${b.chantierId}`}>Ouvrir</Lien>
          <button type="button" className="psh-btn ghost" onClick={() => deplacer(b.chantierId, -1)}>−1 j</button>
          <button type="button" className="psh-btn ghost" onClick={() => deplacer(b.chantierId, 1)}>+1 j</button>
          <button type="button" className="psh-btn ghost" onClick={() => deplacer(b.chantierId, 7)}>+1 sem.</button>
        </div>
      )}
    </div>
  )
}

function AbonnerAgenda({ exemple }: { exemple: boolean }) {
  const [etat, setEtat] = useState<{ actif: boolean; cree_le: string | null; dernier_acces_le: string | null } | null>(null)
  const [indispo, setIndispo] = useState<string | null>(null)
  const [adresse, setAdresse] = useState<string | null>(null)
  const [message, setMessage] = useState<Message>(null)
  useEffect(() => {
    if (exemple) return
    void appel<{ actif: boolean; cree_le: string | null; dernier_acces_le: string | null }>('/api/crm/agenda').then((r) => { if (r.ok) setEtat(r.corps); else if (r.status === 503) setIndispo(r.erreur) })
  }, [exemple])
  async function creer() {
    if (etat?.actif && !confirm('Créer un NOUVEAU lien ? L’ancien cessera de fonctionner : il faudra réabonner vos agendas.')) return
    setMessage(null)
    const r = await appel<{ adresse: string }>('/api/crm/agenda', { method: 'POST' })
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    setAdresse(r.corps.adresse); setEtat({ actif: true, cree_le: new Date().toISOString(), dernier_acces_le: null })
  }
  async function revoquer() {
    if (!confirm('Révoquer le lien ? Vos agendas abonnés ne recevront plus vos chantiers.')) return
    const r = await appel('/api/crm/agenda', { method: 'DELETE' })
    if (!r.ok) { setMessage({ texte: r.erreur, erreur: estErreur(r) }); return }
    setAdresse(null); setEtat({ actif: false, cree_le: null, dernier_acces_le: null })
  }
  return (
    <section className="psh-panel" aria-labelledby="crm-agenda">
      <header><h2 id="crm-agenda">Abonner mon agenda</h2></header>
      <div className="crm-corps">
        <p className="crm-vide">Vos chantiers et vos rendez-vous dans Google Agenda, l’agenda de l’iPhone ou Outlook, mis à jour tout seuls. Le lien est privé : ne le partagez pas.</p>
        {exemple ? <p className="crm-note">Dans l’exemple, aucun lien n’est créé.</p> : indispo ? <p className="crm-note">{indispo}</p> : (
          <>
            {adresse && (
              <div className="crm-agenda-lien">
                <label className="crm-champ">Votre lien (il ne s’affiche qu’une fois : copiez-le maintenant)<input readOnly value={adresse} onFocus={(e) => e.target.select()} /></label>
                <div className="crm-boutons"><button type="button" className="psh-btn primary" onClick={() => void navigator.clipboard?.writeText(adresse).then(() => setMessage({ texte: 'Lien copié.', erreur: false }), () => setMessage({ texte: 'Copie impossible : sélectionnez le lien et copiez-le.', erreur: true }))}>Copier le lien</button></div>
                <ul className="crm-aide-liste">
                  <li><b>Google Agenda</b> (sur ordinateur) : « Autres agendas » → « + » → « À partir de l’URL », collez le lien.</li>
                  <li><b>iPhone</b> : Réglages → Calendrier → Comptes → Ajouter un compte → Autre → « Ajouter un calendrier avec abonnement ».</li>
                  <li><b>Outlook</b> : Ajouter un calendrier → « S’abonner à partir du web ».</li>
                </ul>
              </div>
            )}
            {etat && !adresse && <p className="muted">{etat.actif ? `Lien actif depuis le ${dateFr(etat.cree_le)}${etat.dernier_acces_le ? ` · lu par un agenda le ${dateFr(etat.dernier_acces_le)}` : ' · encore jamais lu'}.` : 'Aucun lien pour l’instant.'}</p>}
            <div className="crm-boutons">
              <button type="button" className="psh-btn ghost" onClick={() => void creer()}>{etat?.actif ? 'Nouveau lien' : 'Créer mon lien d’agenda'}</button>
              {etat?.actif && <button type="button" className="psh-btn ghost danger" onClick={() => void revoquer()}>Révoquer</button>}
            </div>
          </>
        )}
        {message && <p className={`crm-message${message.erreur ? ' erreur' : ''}`} role={message.erreur ? 'alert' : 'status'}>{message.texte}</p>}
      </div>
    </section>
  )
}
