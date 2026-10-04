import type { Blocage, Etat, PostVu, SuiviContenu } from '@/app/controle/contenu/suivi'

// Panneaux de suivi du contenu (fiche 026-216, C13) : affichage pur du `SuiviContenu` de app/controle/contenu/suivi.ts.
// Cinq panneaux (Tour du Crieur, Audience, Recettes, Radar, Studio pubs) et la carte des blocages pour Benj. Aucun bouton de
// publication, aucun envoi, aucun lien sortant : on lit. Tout texte servi est écrit tel quel (jamais interprété comme du HTML).
// Un état vide, « non servi », en attente de R6 ou en panne se dit en mots ; un nombre n'apparaît que s'il est servi.
const MOTS_ETAT: Record<Etat, string> = { ok: 'à jour', vide: 'vide', attente_r6: 'en attente R6', panne: 'en panne', non_servi: 'non servi' }
const HEURE = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const quand = (iso: string | null | undefined) => { const t = iso ? Date.parse(iso) : NaN; return Number.isFinite(t) ? HEURE.format(new Date(t)) : 'date inconnue' }

function Etat_({ etat, message }: { etat: Etat; message: string | null }) {
  if (etat === 'ok' && !message) return null
  const grave = etat === 'panne' || etat === 'non_servi'
  return <p className={grave ? 'warn' : 'muted'} role={grave ? 'alert' : 'status'} data-etat-message={etat}>{message ?? MOTS_ETAT[etat]}</p>
}

function Panneau({ cle, titre, etat, children }: { cle: string; titre: string; etat: Etat; children: React.ReactNode }) {
  const titreId = `suivi-${cle}-titre`
  return (
    <section className="tool-card" data-suivi-panneau={cle} data-etat={etat} aria-labelledby={titreId} style={{ minWidth: 0, overflow: 'hidden' }}>
      <h2 id={titreId}>{titre} <span className="muted" style={{ fontSize: '.8rem', fontWeight: 400 }}>· {MOTS_ETAT[etat]}</span></h2>
      {children}
    </section>
  )
}

const liste = { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '.5rem' } as const
const ligneStyle = { minWidth: 0, padding: '.4rem 0', borderTop: '1px solid var(--border, rgba(127,127,127,.25))', overflowWrap: 'anywhere' } as const

function Versions({ posts, vide }: { posts: PostVu[]; vide: string }) {
  if (posts.length === 0) return <p className="muted">{vide}</p>
  return (
    <ul style={liste}>
      {posts.map((p) => (
        <li key={p.id} style={ligneStyle} data-post={p.id}>
          <strong>{p.ligne} · {p.canal}</strong> <span className="muted">· {p.rendu}</span>
          <details>
            <summary className="muted">Version exacte (ce que le public verra)</summary>
            <ul style={{ ...liste, marginTop: '.3rem' }}>{p.dit.map((d, i) => <li key={i} style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{d}</li>)}</ul>
          </details>
        </li>
      ))}
    </ul>
  )
}

/** La carte pour Benj : l'affirmation, ce qui manque. Aucune donnée de prospect : seul le texte du post et sa source y figurent. */
function CarteBlocage({ b }: { b: Blocage }) {
  return (
    <li style={{ ...ligneStyle, border: '1px solid var(--border, rgba(127,127,127,.4))', borderRadius: 8, padding: '.6rem .8rem' }} data-blocage={b.postId} role="group" aria-label={`Blocage ${b.ligne} ${b.canal}`}>
      <strong>{b.ligne} · {b.canal} : bloqué, renvoyé à Benj</strong>
      <p style={{ margin: '.3rem 0', whiteSpace: 'pre-wrap' }} data-blocage-texte>{b.texteExact}</p>
      <p className="warn" style={{ margin: 0 }} data-blocage-manque>{b.manque}</p>
      <p className="muted" style={{ margin: '.2rem 0 0' }}>Source : {b.source ?? 'aucune'} · verdict : {b.verdict} · probabilité : {b.probabilite === null ? 'non servie' : b.probabilite}</p>
    </li>
  )
}

export default function PanneauxContenu({ suivi }: { suivi: SuiviContenu | null | undefined }) {
  if (!suivi) return <section className="tool-card" data-suivi-panneau="indisponible"><h2>Suivi du contenu</h2><p className="warn" role="alert">Le suivi du contenu n’est pas servi : rien n’est montré à sa place.</p></section>
  const { crieur, audience, recettes, radar, studio, blocages } = suivi
  return (
    <div data-suivi-contenu style={{ display: 'grid', gap: '1.2rem', minWidth: 0 }}>
      {blocages.length > 0 ? (
        <section className="tool-card" data-suivi-panneau="blocages" data-etat="panne" aria-labelledby="suivi-blocages-titre">
          <h2 id="suivi-blocages-titre">Blocages pour Benj ({blocages.length})</h2>
          <p className="muted">Une affirmation chiffrée sans preuve, ou dont la probabilité de jev noul est inférieure à 0,5, ne part pas.</p>
          <ul style={liste}>{blocages.map((b, i) => <CarteBlocage key={`${b.postId}-${i}`} b={b} />)}</ul>
        </section>
      ) : null}

      <Panneau cle="crieur" titre="Tour du Crieur" etat={crieur.etat}>
        <Etat_ etat={crieur.etat} message={crieur.message} />
        {crieur.lignes.length > 0 ? (
          <ul style={liste} aria-label="Lignes L1 à L5">
            {crieur.lignes.map((l) => (
              <li key={l.id} style={ligneStyle} data-ligne={l.id}>
                <strong>{l.id}</strong> · {l.libelle} <span className="muted">· {l.canaux.join(', ')}</span>
                <div className="muted">{l.suspendue ? 'suspendue' : l.approuvee ? 'approuvée' : 'non approuvée'} · {l.enAttente} en attente d’accord · {l.publies} publiée{l.publies > 1 ? 's' : ''}</div>
              </li>
            ))}
          </ul>
        ) : null}
        {crieur.etat === 'non_servi' ? null : (
          <>
            <h3 style={{ fontSize: '1rem', margin: '.8rem 0 .3rem' }}>En attente d’accord individuel</h3>
            <Versions posts={crieur.enAttente} vide="Aucune publication n’attend d’accord." />
            <h3 style={{ fontSize: '1rem', margin: '.8rem 0 .3rem' }}>File TikTok</h3>
            <Versions posts={crieur.fileTiktok} vide="La file TikTok est vide." />
            {crieur.attenteR6.length > 0 ? (
              <>
                <h3 style={{ fontSize: '1rem', margin: '.8rem 0 .3rem' }} data-attente-r6>En attente R6 (Meta)</h3>
                <p className="muted">Le geste R6 n’est pas ouvert : ces publications ne partent pas.</p>
                <Versions posts={crieur.attenteR6} vide="" />
              </>
            ) : null}
            {crieur.refuses.length > 0 ? (
              <>
                <h3 style={{ fontSize: '1rem', margin: '.8rem 0 .3rem' }}>Accord refusé</h3>
                <ul style={liste}>{crieur.refuses.map((r) => <li key={r.id} style={ligneStyle} data-refuse={r.id}><strong>{r.ligne} · {r.canal}</strong> <span className="muted">· {r.motif}</span></li>)}</ul>
              </>
            ) : null}
            <h3 style={{ fontSize: '1rem', margin: '.8rem 0 .3rem' }}>Publications et preuves publiques</h3>
            {crieur.publications.length === 0 ? <p className="muted">Aucune publication publiée.</p> : (
              <ul style={liste}>
                {crieur.publications.map((p) => (
                  <li key={p.id} style={ligneStyle} data-publication={p.id}>
                    <strong>{p.ligne} · {p.canal}</strong> <span className="muted">· {quand(p.publieLe)}</span>
                    <div className={p.preuveManquante ? 'warn' : 'muted'} data-preuve>{p.preuveManquante ? 'preuve publique manquante' : `preuve : ${p.preuve}`}</div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </Panneau>

      <Panneau cle="audience" titre="Audience par publication" etat={audience.etat}>
        <Etat_ etat={audience.etat} message={audience.message} />
        {audience.publications.map((p) => (
          <div key={p.postId} data-audience-post={p.postId} style={{ marginTop: '.6rem', minWidth: 0 }}>
            <strong>{p.ligne} · {p.canal}</strong>
            {p.echeances.map((x) => (
              <div key={x.echeance} role="region" aria-label={`${p.ligne} ${p.canal} ${x.echeance}`} tabIndex={0} style={{ overflowX: 'auto', maxWidth: '100%' }}>
                <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: '.88rem' }}>
                  <caption className="muted" style={{ textAlign: 'left' }}>{x.echeance} · {x.statut === 'echue' ? 'échue' : 'en attente'}</caption>
                  <thead><tr><th scope="col" style={{ textAlign: 'left' }}>Mesure</th><th scope="col" style={{ textAlign: 'left' }}>Valeur</th><th scope="col" style={{ textAlign: 'left' }}>Source</th><th scope="col" style={{ textAlign: 'left' }}>Relevé</th></tr></thead>
                  <tbody>
                    {x.cellules.length === 0 ? <tr><td colSpan={4} className="muted">{x.statut === 'echue' ? 'aucune mesure servie' : 'en attente'}</td></tr> : x.cellules.map((c) => (
                      <tr key={c.metrique} data-mesure={c.metrique} data-disponible={c.disponible ? 'oui' : 'non'}>
                        <th scope="row" style={{ textAlign: 'left', fontWeight: 400 }}>{c.metrique}</th>
                        <td className={c.disponible ? undefined : 'muted'}>{c.texte}{c.estimation && c.fenetreH ? ` · fenêtre ${c.fenetreH} h` : ''}</td>
                        <td className="muted">{c.source ?? 'aucune'}</td>
                        <td className="muted">{c.le ? quand(c.le) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        ))}
      </Panneau>

      <Panneau cle="recettes" titre="Recettes par ligne" etat={recettes.etat}>
        <Etat_ etat={recettes.etat} message={recettes.message} />
        {recettes.lignes.length > 0 ? (
          <ul style={liste}>{recettes.lignes.map((l) => <li key={l.ligne} style={ligneStyle} data-vente-ligne={l.ligne}>{l.libelle}</li>)}</ul>
        ) : null}
        {recettes.etat === 'ok' ? <p className="muted">Une vente rattachée à une ligne par la fenêtre de temps reste une estimation : ni la visite par campagne ni le code d’apport ne prouvent seuls qu’un post l’a causée.</p> : null}
      </Panneau>

      <Panneau cle="radar" titre="Radar · onglet Contenu" etat={radar.etat}>
        <Etat_ etat={radar.etat} message={radar.message} />
        {radar.candidats.length > 0 ? (
          <>
            <p className="muted">Aide au choix : le score classe, il ne rédige rien et n’autorise aucun envoi.</p>
            <ul style={liste}>
              {radar.candidats.map((c) => (
                <li key={c.id} style={ligneStyle} data-candidat={c.id}>
                  <strong>{c.id}</strong> · {c.statut} <span className="muted">· signal {c.signal} · {c.niveau === null ? 'score Laya indisponible' : `score Laya ${c.niveau}/5 (${c.provenance})`}</span>
                  <div className="muted">{c.motif}</div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </Panneau>

      <Panneau cle="studio" titre="Studio pubs · onglet Presti" etat={studio.etat}>
        <Etat_ etat={studio.etat} message={studio.message} />
        {studio.enAttente.length > 0 ? <Versions posts={studio.enAttente} vide="" /> : null}
      </Panneau>
    </div>
  )
}
