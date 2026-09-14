'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { apiDirection } from './client'
import Fraicheur, { type SourceInfo } from './Fraicheur'
import { relTime } from '@/lib/direction/fraicheur'
import { CLE_NE_PAS_COMPTER, hoteMesure, libellePage, libelleSource } from '@/lib/audience'

// « Visiteurs » (demande de Benj du 14/09) : qui regarde prestiapp.fr, en direct — sans jamais savoir QUI.
//
// Le fil ne montre qu'une page, une minute, et s'il s'agit d'une arrivée. La première version y mêlait, à la seconde,
// les attributs de chaque vue (source, appareil, navigateur, pays) et les connexions et inscriptions NOMMÉES : par
// faible trafic, deux lignes voisines disaient qui était qui (revue adversariale du 14/09). La deuxième masquait les
// attributs sur la seule page d'inscription, et la ligne d'accueil du même visiteur, juste en dessous, les gardait
// (contre-revue). Les attributs d'une visite ne vivent donc plus que dans les agrégats sur 7 jours, et les
// inscriptions du jour sont un nombre sans nom. C'est la condition de l'exemption de consentement (migration 0090).
//
// Le passé : la vitrine n'était mesurée par rien avant 0090 (Google Analytics jamais branché, Vercel Analytics
// jamais activé). L'historique dit donc depuis quand chaque courbe existe, au lieu de dessiner des zéros.
type Paire = { cle: string; n: number }
type VueFlux = { a: string; chemin: string; entree: boolean }
type Direct = {
  en_ligne: number; pages_en_ligne: Paire[]; vues_jour: number; visiteurs_jour: number
  entonnoir_jour: { accueil: number; inscription: number; connexion: number }
  sources_7j: Paire[]; campagnes_7j?: Paire[]; pages_7j: Paire[]; appareils_7j: Paire[]; pays_7j: Paire[]; flux: VueFlux[]; premiere_vue: string | null
}
type Jour = { jour: string; site_vues: number; site_visiteurs: number; plateformes_vues: number; plateformes_demandes: number; inscriptions: number; sessions: number }
type Historique = { jours: Jour[]; mesure_depuis: string | null; plateformes_depuis: string | null }
type Sourcee<T> = { valeur: T | null; source: string; a: string; cache: boolean; erreur?: string }
type Reponse = { direct: Sourcee<Direct>; inscriptions: Sourcee<number>; historique: Sourcee<Historique> | null; saturee: boolean | null; plafondJour: number; a: string }

const APPAREILS: Record<string, string> = { mobile: 'Mobile', tablette: 'Tablette', ordinateur: 'Ordinateur' }
const ENTONNOIR: Record<string, string> = { visiteurs: 'Visiteurs du jour', accueil: 'ont vu l’accueil', inscription: 'ont ouvert l’inscription', connexion: 'ont ouvert la connexion', comptes: 'comptes créés aujourd’hui' }
const SERIES = [
  { cle: 'site_visiteurs', label: 'Visiteurs du site' },
  { cle: 'site_vues', label: 'Pages vues' },
  { cle: 'plateformes_vues', label: 'Pages des artisans' },
  { cle: 'plateformes_demandes', label: 'Demandes reçues' },
  { cle: 'inscriptions', label: 'Inscriptions' },
  { cle: 'sessions', label: 'Connexions' },
] as const
type CleSerie = (typeof SERIES)[number]['cle']

// Pas de drapeau émoji : Windows ne les dessine pas et affiche deux lettres (« FR France », vu à la capture du 14/09).
const regions = (() => { try { return new Intl.DisplayNames(['fr'], { type: 'region' }) } catch { return null } })()
const nomPays = (code: string | null) => (!code || code === '??' ? 'Pays inconnu' : regions?.of(code) ?? code)
const dateCourte = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', timeZone: 'Europe/Paris' })

function Barres({ lignes, libelle, vide }: { lignes: Paire[]; libelle: (cle: string) => string; vide: string }) {
  if (!lignes.length) return vide ? <p className="vis-vide">{vide}</p> : null
  const max = Math.max(1, ...lignes.map((l) => l.n))
  return (
    <ul className="vis-barres">
      {lignes.map((l) => (
        <li key={l.cle} data-barre={l.cle}>
          <span>{libelle(l.cle)}</span><span className="n">{l.n}</span>
          <span className="jauge" aria-hidden="true"><span style={{ width: `${Math.round((l.n / max) * 100)}%` }} /></span>
        </li>
      ))}
    </ul>
  )
}

export default function Visiteurs() {
  const [donnees, setDonnees] = useState<Reponse | null>(null)
  const [historique, setHistorique] = useState<Sourcee<Historique> | null>(null)
  const [panne, setPanne] = useState<string | null>(null)
  const [panneHistorique, setPanneHistorique] = useState<string | null>(null)
  const [maintenant, setMaintenant] = useState(() => Date.now())
  const [serie, setSerie] = useState<CleSerie>('site_visiteurs')
  const [moi, setMoi] = useState<{ mesure: boolean; compte: boolean; hote: string } | null>(null)
  const historiqueRecu = useRef(false)

  const charger = useCallback(async (avecHistorique: boolean) => {
    const r = await apiDirection<Reponse>(`/api/controle/audience${avecHistorique ? '?historique=1' : ''}`)
    setMaintenant(Date.now())
    // Une panne se DIT, et ce qui était affiché reste : « 0 en ligne » sur une base muette serait un mensonge.
    if (!r.ok) {
      const m = r.data.error ?? 'La mesure d’audience ne répond pas.'
      setPanne(m)
      if (avecHistorique) setPanneHistorique(m)
      return
    }
    setPanne(null)
    setDonnees(r.data)
    if (r.data.historique) { historiqueRecu.current = true; setHistorique(r.data.historique); setPanneHistorique(null) }
  }, [])

  useEffect(() => {
    void charger(true)
    // Dix secondes, onglet visible seulement : assez pour « en direct », et 6 appels par minute sur les 120 que
    // tous les onglets du Poste partagent (lib/direction/garde.ts). Tant que l'historique n'est jamais arrivé, chaque
    // passage le redemande : un premier appel en panne ne laisse plus le panneau vide cinq minutes.
    const direct = setInterval(() => { if (document.visibilityState === 'visible') void charger(!historiqueRecu.current) }, 10_000)
    const passe = setInterval(() => { if (document.visibilityState === 'visible') void charger(true) }, 300_000)
    const horloge = setInterval(() => setMaintenant(Date.now()), 5_000)
    return () => { clearInterval(direct); clearInterval(passe); clearInterval(horloge) }
  }, [charger])

  useEffect(() => {
    // Le stockage est propre à chaque ORIGINE : sur qg.prestiapp.fr, une clé posée ici ne serait jamais lue par la
    // vitrine. On ne propose la bascule que là où la mesure tourne, et sinon un lien qui pose la clé chez elle.
    try { setMoi({ mesure: hoteMesure(window.location.hostname), compte: localStorage.getItem(CLE_NE_PAS_COMPTER) === 'oui', hote: window.location.host }) } catch { setMoi(null) }
  }, [])
  const basculer = () => {
    if (!moi) return
    try { localStorage.setItem(CLE_NE_PAS_COMPTER, moi.compte ? 'non' : 'oui'); setMoi({ ...moi, compte: !moi.compte }) } catch { /* stockage fermé */ }
  }

  const d = donnees?.direct.valeur ?? null
  const inscriptionsJour = donnees?.inscriptions.valeur ?? null
  // Quatre états distincts : chargement, rien encore lu à cause d'une panne, mesure en panne, et vraiment rien —
  // « Personne sur le site » ne se dit que quand la base l'a dit.
  const etat = (vide: string) => (!donnees ? (panne ? `Mesure injoignable : ${panne}` : 'Chargement…')
    : !d ? `Mesure indisponible${donnees.direct.erreur ? ` : ${donnees.direct.erreur}` : ''}.` : vide)

  const fil = (d?.flux ?? []).map((v, i) => ({ id: `${v.a}:${i}`, a: v.a, genre: v.entree ? 'Arrivée' : 'Visite', pill: v.entree ? 'info' : 'muted', titre: libellePage(v.chemin) }))

  const kpi = (lab: string, valeur: string, s: SourceInfo | null | undefined, sub?: ReactNode) => (
    <div className="psh-kpi" data-kpi={lab}>
      <div className="lab">{lab}</div>
      <div className="val">{valeur}</div>
      <div className="sub">{sub ? <>{sub}<br /></> : null}{s ? <Fraicheur s={s} maintenant={maintenant} /> : <span className={`dir-src${panne ? ' crit' : ''}`}>{panne ? 'injoignable' : 'chargement…'}</span>}</div>
    </div>
  )
  const nombre = (s: Sourcee<unknown> | undefined, v: number | null | undefined) => (!s ? (panne ? '—' : '…') : s.valeur === null || v === null || v === undefined ? '—' : String(v))

  const h = historique?.valeur ?? null
  const choisie = SERIES.find((s) => s.cle === serie) ?? SERIES[0]
  const valeurs = (h?.jours ?? []).map((j) => j[serie])
  const max = Math.max(1, ...valeurs)
  const total = valeurs.reduce((a, b) => a + b, 0)
  const note = serie === 'site_visiteurs' || serie === 'site_vues'
    ? (h?.mesure_depuis
      ? `La vitrine est mesurée depuis le ${dateCourte(h.mesure_depuis)}. Avant, aucune visite n’a été enregistrée nulle part : Google Analytics n’a jamais été branché et Vercel Analytics jamais activé — ce passé-là ne se retrouve pas.`
      : 'Aucune visite enregistrée pour l’instant. Avant cette mesure, rien n’enregistrait les visites de la vitrine : ce passé-là ne se retrouve pas.')
    : serie === 'plateformes_vues' || serie === 'plateformes_demandes'
      ? `Pages de conversation des artisans${h?.plateformes_depuis ? `, comptées depuis le ${dateCourte(h.plateformes_depuis)}` : ''} : une vue par session de navigateur, artisans réels seulement, en total (jamais par artisan).`
      : 'Comptes réels seulement : ni fondateur, ni démonstration, ni compte de test. Des totaux par jour, sans nom.'

  return (
    <>
      {panne ? <p className="notif-erreur" role="alert" data-panne>{panne} {donnees ? 'Ce qui était affiché reste ; le prochain rafraîchissement réessaie.' : 'Rien n’a encore pu être lu ; nouvel essai dans 10 s.'}</p> : null}
      {donnees?.saturee ? <p className="notif-erreur" role="alert" data-saturee>Plafond du jour atteint ({donnees.plafondJour.toLocaleString('fr-FR')} vues) : les nouvelles visites ne sont plus comptées jusqu’à minuit, heure de Paris, au plus tard. Les chiffres du jour peuvent contenir du trafic artificiel.</p> : null}

      <section className="dir-chiffres" aria-labelledby="vis-t" data-visiteurs>
        <h2 id="vis-t" className="dir-h2">Visiteurs de prestiapp.fr</h2>
        <div className="psh-kpis dir-kpis">
          {kpi('En ligne maintenant', nombre(donnees?.direct, d?.en_ligne), donnees?.direct, <span className="vis-direct"><span className="vis-pouls" aria-hidden="true" />actifs ces 5 dernières minutes</span>)}
          {kpi('Visiteurs aujourd’hui', nombre(donnees?.direct, d?.visiteurs_jour), donnees?.direct, 'personnes distinctes, sans savoir qui')}
          {kpi('Pages vues aujourd’hui', nombre(donnees?.direct, d?.vues_jour), donnees?.direct)}
          {kpi('Inscriptions aujourd’hui', nombre(donnees?.inscriptions, inscriptionsJour), donnees?.inscriptions, 'un nombre, sans nom')}
        </div>
      </section>

      <div className="vis-grille">
        <section className="psh-panel dir-fil" data-vis-fil aria-labelledby="vis-fil-t">
          <header><h2 id="vis-fil-t">En direct</h2><span className="tag">40 dernières vues · page et minute · toutes les 10 s</span></header>
          <div className="dir-liste">
            {!d ? <div className="psh-item"><div className="psh-ibody"><p>{etat('')}</p></div></div>
              : fil.length === 0 ? <div className="psh-item"><div className="psh-ibody"><b>Personne encore.</b><p>Une page ouverte sur prestiapp.fr apparaît ici quelques secondes plus tard.</p></div></div>
              : fil.map((e) => (
                <div key={e.id} className="psh-item" data-evenement="vue">
                  <span className={`pill ${e.pill}`}>{e.genre}</span>
                  <div className="psh-ibody"><div className="top"><b>{e.titre}</b><span className="time">{relTime(e.a, maintenant)}</span></div></div>
                </div>
              ))}
          </div>
          <p className="vis-note">D’où ils viennent, sur quel appareil et de quel pays : seulement en totaux sur 7 jours, plus bas. Ligne par ligne, ces détails permettraient de reconnaître quelqu’un.</p>
        </section>

        <div className="vis-col">
          <section className="psh-panel" data-vis-maintenant aria-labelledby="vis-m-t">
            <header><h2 id="vis-m-t">Sur le site en ce moment</h2><span className="tag">{d ? `${d.en_ligne} en ligne` : panne ? '—' : '…'}</span></header>
            <Barres lignes={d?.pages_en_ligne ?? []} libelle={libellePage} vide={etat('Personne sur le site ces cinq dernières minutes.')} />
          </section>
          <section className="psh-panel" data-vis-entonnoir aria-labelledby="vis-e-t">
            <header><h2 id="vis-e-t">Le chemin d’aujourd’hui</h2></header>
            <Barres
              lignes={d && d.vues_jour > 0 ? [{ cle: 'visiteurs', n: d.visiteurs_jour }, { cle: 'accueil', n: d.entonnoir_jour.accueil }, { cle: 'inscription', n: d.entonnoir_jour.inscription }, { cle: 'connexion', n: d.entonnoir_jour.connexion }, ...(inscriptionsJour !== null ? [{ cle: 'comptes', n: inscriptionsJour }] : [])] : []}
              libelle={(c) => ENTONNOIR[c] ?? c} vide={etat('Aucune visite aujourd’hui.')} />
            <p className="vis-note">Des visiteurs distincts par page, pas une personne suivie de page en page. Les comptes créés sont un nombre venu d’ailleurs : rien ne les relie aux visites.</p>
          </section>
          <section className="psh-panel" data-vis-moi aria-labelledby="vis-moi-t">
            <header><h2 id="vis-moi-t">Vos propres visites</h2></header>
            {!moi ? <p className="vis-note">Stockage du navigateur fermé : impossible de s’exclure ici. Activez « Global Privacy Control » ou « Do Not Track ».</p>
              : moi.mesure ? (
                <>
                  <p className="vis-note">{moi.compte ? 'Ce navigateur est compté (choix de test).' : 'Ce navigateur n’est pas compté sur la vitrine.'} Sur un autre appareil : bouton « Ne plus me compter » de la page Confidentialité.</p>
                  <p className="vis-note"><button type="button" className="psh-btn" onClick={basculer} data-basculer>{moi.compte ? 'Ne plus compter ce navigateur' : 'Compter ce navigateur (pour tester)'}</button></p>
                </>
              ) : (
                <p className="vis-note">
                  Le Poste est ouvert sur {moi.hote}, où rien n’est mesuré ; l’exclusion se règle là où la mesure tourne.{' '}
                  <a href="https://prestiapp.fr/confidentialite?exclure=1#audience" data-exclure>Exclure ce navigateur de la mesure</a>
                </p>
              )}
          </section>
        </div>
      </div>

      <div className="vis-trois">
        <section className="psh-panel" data-vis-sources aria-labelledby="vis-s-t">
          <header><h2 id="vis-s-t">D’où ils viennent</h2><span className="tag">7 jours · arrivées</span></header>
          <Barres lignes={d?.sources_7j ?? []} libelle={libelleSource} vide={etat('Aucune arrivée sur 7 jours.')} />
          {d?.campagnes_7j?.length ? <><p className="vis-note">Nos campagnes (liens marqués, hors connexion et inscription)</p><Barres lignes={d.campagnes_7j} libelle={(c) => c} vide="" /></> : null}
        </section>
        <section className="psh-panel" data-vis-pages aria-labelledby="vis-p-t">
          <header><h2 id="vis-p-t">Pages vues</h2><span className="tag">7 jours</span></header>
          <Barres lignes={d?.pages_7j ?? []} libelle={libellePage} vide={etat('Aucune page vue sur 7 jours.')} />
        </section>
        <section className="psh-panel" data-vis-appareils aria-labelledby="vis-a-t">
          <header><h2 id="vis-a-t">Appareils et pays</h2><span className="tag">7 jours · arrivées</span></header>
          <Barres lignes={d?.appareils_7j ?? []} libelle={(c) => APPAREILS[c] ?? c} vide={etat('Rien sur 7 jours.')} />
          {d?.pays_7j.length ? <Barres lignes={d.pays_7j} libelle={nomPays} vide="" /> : null}
        </section>
      </div>

      <section className="psh-panel" data-vis-historique aria-labelledby="vis-h-t">
        <header>
          <h2 id="vis-h-t">30 derniers jours</h2>
          <div className="vis-onglets" role="group" aria-label="Mesure affichée">
            {SERIES.map((s) => <button key={s.cle} type="button" aria-pressed={serie === s.cle} onClick={() => setSerie(s.cle)}>{s.label}</button>)}
          </div>
        </header>
        {!historique ? <p className="vis-vide">{panneHistorique ? `Historique injoignable : ${panneHistorique}` : 'Chargement…'}</p>
          : !h ? <p className="vis-vide">Historique indisponible{historique.erreur ? ` : ${historique.erreur}` : ''}.</p>
          : (
            <div className="vis-histo">
              <div className="vis-histo-barres" role="img" aria-label={`${choisie.label} par jour sur 30 jours : ${total} au total`}>
                {h.jours.map((j) => <span key={j.jour} className={`b${j[serie] === 0 ? ' zero' : ''}`} style={{ height: `${Math.max(2, Math.round((j[serie] / max) * 100))}%` }} title={`${dateCourte(j.jour)} : ${j[serie]}`} />)}
              </div>
              <div className="vis-histo-axe"><span>{h.jours[0] ? dateCourte(h.jours[0].jour) : ''}</span><span>{total} au total</span><span>aujourd’hui</span></div>
            </div>
          )}
        <p className="vis-note">{note}</p>
      </section>
    </>
  )
}
