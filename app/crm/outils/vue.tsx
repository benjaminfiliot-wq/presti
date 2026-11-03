import type { ReactNode } from 'react'
import type { Capacite } from '@/lib/plans'

// « Mes outils » (tâche 036-033, audits 036-028 et 036-029 : « aucun bouton Connecter n'existe »). Ce fichier ne porte AUCUN effet :
// le catalogue des outils dont le circuit existe, les messages du retour de Google, et la vue, faite de composants sans état ni
// crochet (props → éléments). Le conteneur (Outils.tsx) lit, appelle les routes et tient l'état ; le juge scripts/connecter-ecran-qa.mjs
// rend cette vue hors ligne, presse ses boutons et en tire les captures. Aucune importation à l'exécution ici : seulement des types.
//
// Règle : « une fonctionnalité non finie n'apparaît pas ». Un outil n'entre dans OUTILS que si son circuit existe : une valeur de
// FOURNISSEURS_GOOGLE (lib/connexions/oauth.ts), la même capacité que CAPACITE, et les routes app/api/connexions/google/demarrer,
// retour, retirer. Le juge relit lib/connexions/oauth.ts : un outil sans circuit, ou une capacité recopiée de travers, le fait rougir.

export type Fournisseur = 'gmail' | 'google_agenda' | 'google_drive'
export type Outil = { fournisseur: Fournisseur; nom: string; role: string; capacite: Capacite; icone: 'courrier' | 'agenda' | 'dossier' }

/** Les outils branchables aujourd'hui, dans l'ordre d'affichage. Les rôles disent exactement les portées de lib/connexions/oauth.ts. */
export const OUTILS: readonly Outil[] = [
  { fournisseur: 'gmail', nom: 'Gmail', icone: 'courrier', capacite: 'canaux.email',
    role: 'Vos assistants lisent les demandes qui arrivent dans votre boîte. Lecture seule : rien n’est envoyé ni effacé depuis Gmail.' },
  { fournisseur: 'google_agenda', nom: 'Google Agenda', icone: 'agenda', capacite: 'assistant',
    role: 'Vos créneaux occupés, pour ne jamais proposer une heure déjà prise. Ni le titre ni les invités de vos rendez-vous.' },
  { fournisseur: 'google_drive', nom: 'Google Drive', icone: 'dossier', capacite: 'assistant',
    role: 'Seulement les fichiers créés pour vous ou ceux que vous ouvrez vous-même. Le reste de votre Drive reste fermé.' },
]

/** Les routes du circuit (036-009). Le juge vérifie que chacune existe et répond à POST. */
export const ROUTE_DEMARRER = '/api/connexions/google/demarrer'
export const ROUTE_RETIRER = '/api/connexions/retirer'

/** Les colonnes que le navigateur lit dans public.connexions : exactement celles que 0193 lui rend, aucune des deux colonnes chiffrées. */
export const COLONNES_LUES = 'id, fournisseur, compte_affiche, etat, motif_erreur, verifiee_le, derniere_synchro, expire_le, cree_le'

/** La tentative en cours, gardée le temps de l'aller-retour chez Google (onglet seulement, rien de secret : l'outil et l'heure). */
export const CLE_TENTATIVE = 'presti-outils-tentative'
export const DUREE_TENTATIVE_MS = 15 * 60 * 1000

export type Connexion = {
  id: string; fournisseur: string; compte_affiche: string | null; etat: 'a_verifier' | 'active' | 'expiree' | 'erreur' | 'retiree'
  motif_erreur: string | null; verifiee_le: string | null; derniere_synchro: string | null; expire_le: string | null; cree_le: string | null
}
export type Avis = { ton: 'ok' | 'erreur'; texte: string }

export const nomDe = (f: string | null | undefined): string | null => OUTILS.find((o) => o.fournisseur === f)?.nom ?? null

/** Chaque motif que la route de retour peut rendre (lib/connexions/routes.ts, retourVers ; controlerPortees), dit en clair. */
export const MOTIFS_RETOUR: Readonly<Record<string, string>> = {
  etat_invalide: 'La demande a expiré ou a été ouverte dans un autre navigateur. Recommencez depuis cet écran.',
  refuse_par_artisan: 'Vous avez refusé l’accès chez Google. Rien n’a été branché.',
  code_absent: 'Google n’a pas renvoyé d’autorisation. Rien n’a été branché : recommencez.',
  compte: 'Votre session a changé pendant la connexion. Reconnectez-vous, puis recommencez.',
  offre: 'Votre offre ne comprend pas cet outil, ou il n’est pas encore ouvert.',
  non_configure: 'La connexion à Google n’est pas disponible pour le moment. Réessayez plus tard.',
  echange_refuse: 'Google a refusé l’échange d’autorisation. Rien n’a été branché : recommencez.',
  enregistrement: 'L’autorisation n’a pas pu être enregistrée. Rien n’a été branché : recommencez.',
  portee_refusee: 'Une case a été décochée chez Google : l’outil ne peut pas marcher sans elle. Recommencez en laissant tout coché.',
  portee_elargie: 'Google a accordé plus que ce qui était demandé : par prudence, rien n’a été branché. Recommencez.',
  essai_lecture_echoue: 'L’autorisation est reçue, mais le premier essai de lecture a échoué. Reconnectez l’outil.',
  inconnu: 'La connexion n’a pas abouti. Recommencez.',
}

/** Le message du retour de Google (`?connexion=ok|refus&motif=…`, et `outil=` ou la tentative gardée pour nommer l'outil). */
export function avisDuRetour(connexion: string | null, motif: string | null, fournisseur: string | null | undefined): Avis | null {
  const nom = nomDe(fournisseur)
  if (connexion === 'ok') return { ton: 'ok', texte: nom ? `${nom} connecté.` : 'Outil connecté.' }
  if (connexion === 'refus') {
    const texte = MOTIFS_RETOUR[motif ?? ''] ?? MOTIFS_RETOUR.inconnu
    return { ton: 'erreur', texte: nom ? `${nom} n’est pas connecté. ${texte}` : texte }
  }
  return null
}

/** Le seul endroit où le bouton « Connecter » envoie le navigateur : l'écran d'autorisation de Google, en https. */
export function urlGoogleSure(u: unknown): u is string {
  if (typeof u !== 'string') return false
  try {
    const x = new URL(u)
    return x.protocol === 'https:' && x.hostname === 'accounts.google.com' && x.pathname.startsWith('/o/oauth2/')
  } catch { return false }
}

const FR = 'fr-FR'
export function jourFr(iso: string | null | undefined): string {
  if (!iso) return ''
  const t = Date.parse(iso)
  return Number.isNaN(t) ? '' : new Date(t).toLocaleDateString(FR, { timeZone: 'Europe/Paris', day: 'numeric', month: 'long', year: 'numeric' })
}

type Pastille = { classe: 'ok' | 'warn' | 'crit' | 'muted'; texte: string }
export function pastille(c: Connexion): Pastille {
  if (c.etat === 'active') return { classe: 'ok', texte: 'Connecté' }
  if (c.etat === 'expiree') return { classe: 'crit', texte: 'Autorisation expirée' }
  if (c.etat === 'erreur') return { classe: 'crit', texte: 'À reconnecter' }
  return { classe: 'warn', texte: 'Vérification en cours' }
}

/** La date montrée : la dernière lecture réussie, sinon la naissance de la connexion. Jamais une date inventée. */
export function dateDe(c: Connexion): string {
  if (c.etat === 'active' && c.verifiee_le) return `Vérifié le ${jourFr(c.verifiee_le)}`
  if (c.etat === 'expiree' && c.expire_le) return `Expirée le ${jourFr(c.expire_le)}`
  return c.cree_le ? `Branché le ${jourFr(c.cree_le)}` : ''
}

// ── La vue ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export type Actions = {
  connecter: (f: Fournisseur) => void
  demanderRetrait: (id: string) => void
  confirmerRetrait: (id: string) => void
  annulerRetrait: () => void
}
export type ProprietesVue = {
  etat: 'chargement' | 'erreur' | 'fermee' | 'pret'
  message?: string
  outils: readonly Outil[]
  horsOffre: boolean
  connexions: readonly Connexion[]
  avis: Avis | null
  aConfirmer: string | null
  occupe: string | null
  actions: Actions
}

function Icone({ type }: { type: Outil['icone'] }) {
  const d = type === 'courrier' ? 'M4 7h16v10H4zM4 7l8 6 8-6' : type === 'agenda' ? 'M5 6h14v13H5zM5 10h14M9 4v4M15 4v4' : 'M4 7h6l2 2h8v9H4z'
  return (
    <span className="mo-icone" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
    </span>
  )
}

function LigneConnexion({ c, nom, aConfirmer, occupe, actions }: { c: Connexion; nom: string; aConfirmer: string | null; occupe: string | null; actions: Actions }) {
  const p = pastille(c)
  const confirme = aConfirmer === c.id
  return (
    <li className="mo-compte" data-connexion={c.id} data-etat={c.etat}>
      <div className="mo-compte-tete">
        <span className={`pill ${p.classe}`}><span className="pdot" />{p.texte}</span>
        <span className="mo-compte-nom">{c.compte_affiche ?? 'Compte Google'}</span>
        <span className="mo-compte-date">{dateDe(c)}</span>
        {!confirme ? (
          <button type="button" className="mo-btn mo-btn-discret" data-geste="retirer" aria-expanded={false} aria-controls={`mo-conf-${c.id}`}
            disabled={occupe === c.id} onClick={() => actions.demanderRetrait(c.id)}>Retirer</button>
        ) : null}
      </div>
      {c.etat === 'erreur' || c.etat === 'expiree' ? (
        <p className="mo-compte-note">Le travail qui dépend de {nom} est en pause. Rien n’est perdu : il reprend dès la reconnexion.</p>
      ) : null}
      {confirme ? (
        <div className="mo-confirmer" id={`mo-conf-${c.id}`} role="group" aria-label={`Confirmer le retrait de ${nom}`}>
          <p>Retirer {nom} ? L’autorisation est effacée tout de suite et vos assistants n’y ont plus accès. Rien n’est supprimé chez Google.</p>
          <div className="mo-confirmer-gestes">
            <button type="button" className="mo-btn mo-btn-danger" data-geste="confirmer-retrait" disabled={occupe === c.id}
              onClick={() => actions.confirmerRetrait(c.id)}>{occupe === c.id ? 'Retrait…' : 'Retirer l’accès'}</button>
            <button type="button" className="mo-btn mo-btn-discret" data-geste="garder" onClick={() => actions.annulerRetrait()}>Garder</button>
          </div>
        </div>
      ) : null}
    </li>
  )
}

function CarteOutil({ o, comptes, aConfirmer, occupe, actions }: { o: Outil; comptes: readonly Connexion[]; aConfirmer: string | null; occupe: string | null; actions: Actions }) {
  const branche = comptes.some((c) => c.etat === 'active')
  const aReprendre = comptes.some((c) => c.etat === 'erreur' || c.etat === 'expiree')
  const libelle = aReprendre ? `Reconnecter ${o.nom}` : comptes.length ? 'Connecter un autre compte' : `Connecter ${o.nom}`
  return (
    <li className="mo-carte" data-outil={o.fournisseur} data-branche={branche ? 'oui' : 'non'}>
      <Icone type={o.icone} />
      <div className="mo-corps">
        <h2 className="mo-nom">{o.nom}{!comptes.length ? <span className="mo-libre">Non branché</span> : null}</h2>
        <p className="mo-role">{o.role}</p>
        {comptes.length ? (
          <ul className="mo-comptes" aria-label={`Comptes ${o.nom} branchés`}>
            {comptes.map((c) => <LigneConnexion key={c.id} c={c} nom={o.nom} aConfirmer={aConfirmer} occupe={occupe} actions={actions} />)}
          </ul>
        ) : null}
      </div>
      <div className="mo-geste">
        <button type="button" className={`mo-btn ${comptes.length && !aReprendre ? 'mo-btn-discret' : 'mo-btn-plein'}`} data-geste="connecter"
          data-fournisseur={o.fournisseur} disabled={occupe === o.fournisseur} onClick={() => actions.connecter(o.fournisseur)}>
          {occupe === o.fournisseur ? 'Ouverture de Google…' : libelle}
        </button>
      </div>
    </li>
  )
}

function Cadre({ children }: { children: ReactNode }) {
  return (
    <div className="mo" data-mes-outils>
      <p className="crm-retour-gestion"><a className="crm-retour" href="/crm">← Outil de gestion</a></p>
      <header className="mo-tete">
        <h1 className="mo-titre">Mes outils</h1>
        <p className="mo-chapo">Branchez les outils que vous utilisez déjà. Vos assistants y lisent ce qu’il faut pour préparer le travail ; vous gardez la main sur chaque accès.</p>
      </header>
      {children}
    </div>
  )
}

export function VueOutils(p: ProprietesVue) {
  if (p.etat === 'chargement') return <Cadre><p className="muted" role="status">Lecture de vos outils…</p></Cadre>
  if (p.etat === 'erreur') return <Cadre><p className="mo-avis mo-avis-erreur" role="alert">{p.message ?? 'La lecture n’a pas abouti. Rechargez dans un instant.'}</p></Cadre>
  if (p.etat === 'fermee') return <Cadre><p className="mo-avis" role="status">La connexion de vos outils n’est pas encore ouverte sur votre compte.</p></Cadre>
  if (p.horsOffre) {
    return (
      <Cadre>
        <p className="mo-avis" role="status">Votre offre ne comprend pas encore la connexion de vos outils. <a className="crm-retour" href="/abonnement">Voir les offres</a></p>
      </Cadre>
    )
  }
  const connus = new Set(p.outils.map((o) => o.fournisseur as string))
  const branches = p.connexions.filter((c) => connus.has(c.fournisseur) && c.etat === 'active').length
  return (
    <Cadre>
      {p.avis ? <p className={`mo-avis mo-avis-${p.avis.ton}`} role={p.avis.ton === 'erreur' ? 'alert' : 'status'} data-avis={p.avis.ton}>{p.avis.texte}</p> : null}
      <p className="mo-compteur"><b>{branches}</b> sur {p.outils.length} branché{branches > 1 ? 's' : ''}</p>
      <ul className="mo-liste">
        {p.outils.map((o) => (
          <CarteOutil key={o.fournisseur} o={o} comptes={p.connexions.filter((c) => c.fournisseur === o.fournisseur)}
            aConfirmer={p.aConfirmer} occupe={p.occupe} actions={p.actions} />
        ))}
      </ul>
      <p className="mo-pied">Une connexion n’est dite « Connecté » qu’après une vraie lecture réussie. Vos autorisations sont chiffrées ; « Retirer » coupe l’accès tout de suite.</p>
    </Cadre>
  )
}
