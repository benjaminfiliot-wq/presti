'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { contrastRatio } from '@/lib/contrast'
import { validerDisposition } from '@/lib/pilotage/disposition'
import { CLES_SALLE, EQUIPAGE, SALLES, SALLE_RESERVEE } from '@/lib/pilotage/equipage'
import { MISES_EN_PAGE, TAILLES_PLAQUES, validerReglages, type Reglages } from '@/lib/pilotage/reglages'
import { CLES_THEME, JETONS_PALETTE, type Theme } from '@/lib/pilotage/theme'
import { apiDirection } from '../../client'
import type { ReglagesServis } from '../Station'
import './reglages.css'

// Le panneau Réglages de la station (fiche 026-187, `?vue=reglages`, rôle direction seulement) : 480 px au bureau, feuille plein
// écran au téléphone. Ce qui se règle, c'est l'habit, jamais les chiffres : thème, mise en page, nuit, équipage (nom, avatar,
// couleur), salles (plaque, teinte, emplacement), jetons de couleur, titre, taille des plaques. L'aperçu est en direct et SANS
// écriture : chaque changement est rendu à Habillage (qui l'applique sur `.mc`) ; seul « Enregistrer » écrit (PUT avec la
// version lue). Les règles viennent des modules purs de lib/pilotage (jamais recopiées) ; les textes réglés restent du texte.
// Les six sections sont toutes dans la page (la barre d'onglets défile jusqu'à la section) : un champ n'est jamais caché.
const ADRESSE = '/api/controle/station/reglages'
const PLAQUE_DE: Record<string, string> = Object.fromEntries([...SALLES, SALLE_RESERVEE].map((s) => [s.cle, s.plaque]))
const LIBELLE_JETON: Record<string, string> = {
  '--mc-fond': 'Fond', '--mc-sol': 'Sol', '--mc-mur': 'Mur', '--mc-coursive': 'Coursive', '--mc-porte': 'Porte',
  '--mc-plaque': 'Plaque', '--mc-ecran': 'Écran', '--mc-texte': 'Texte', '--mc-accent': 'Accent', '--mc-alerte': 'Alerte',
}
const ONGLETS = [
  { cle: 'theme', libelle: 'Thème' }, { cle: 'equipage', libelle: 'Équipage' }, { cle: 'salles', libelle: 'Salles' },
  { cle: 'couleurs', libelle: 'Couleurs' }, { cle: 'affichage', libelle: 'Affichage' }, { cle: 'notifications', libelle: 'Notifications' },
] as const
const HEURES = Array.from({ length: 24 }, (_, h) => h)
const RE_COULEUR = /^#[0-9A-Fa-f]{6}$/
const CONTRASTE_MIN = 4.5

type Version = { version: number; modifie_par: string | null; modifie_le: string | null; reglages: Reglages }
type Statut = { ton: 'ok' | 'panne'; texte: string } | null
type Props = {
  enregistres: ReglagesServis | null
  theme: Theme | null
  echecTheme: string | null
  onApercu: (r: Reglages | null) => void
  onEnregistre: (r: ReglagesServis) => void
  onFermer: () => void
  poser: (p: Record<string, string | null>) => void
}

const objet = (x: unknown): x is Record<string, any> => !!x && typeof x === 'object' && !Array.isArray(x)
const copie = <T,>(x: T): T => JSON.parse(JSON.stringify(x ?? {})) as T
/** Une chaîne stable (clés triées) : deux réglages égaux donnent la même, quel que soit l'ordre d'écriture. */
function stable(x: unknown): string {
  if (Array.isArray(x)) return `[${x.map(stable).join(',')}]`
  if (objet(x)) return `{${Object.keys(x).sort().map((k) => `${JSON.stringify(k)}:${stable(x[k])}`).join(',')}}`
  return JSON.stringify(x) ?? 'null'
}
/** Retire d'un réglage tout objet devenu vide (une clé absente garde le défaut du thème). */
function elaguer(x: any): any {
  if (!objet(x)) return x
  for (const k of Object.keys(x)) { const v = elaguer(x[k]); if (objet(v) && Object.keys(v).length === 0) delete x[k] }
  return x
}
/** Trois voies : `a` (ancienne version enregistrée), `b` (le brouillon), `c` (la nouvelle). Intouché (b = a) → c ; objets des deux côtés → clé par clé ; sinon la valeur touchée de b. */
function rebaser(a: any, b: any, c: any): any {
  if (stable(a) === stable(b)) return copie(c)
  if (objet(b) && objet(c)) {
    const sortie: Record<string, any> = {}
    for (const k of new Set([...Object.keys(b), ...Object.keys(c), ...(objet(a) ? Object.keys(a) : [])])) {
      const v = rebaser(objet(a) ? a[k] : undefined, b[k], c[k])
      if (v !== undefined) sortie[k] = v
    }
    return sortie
  }
  return b
}
const HEURE = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
const quand = (iso: string | null) => { const t = iso ? Date.parse(iso) : NaN; return Number.isFinite(t) ? HEURE.format(new Date(t)) : '—' }

/**
 * Les raisons pour lesquelles un réglage est refusé : celles de validerReglages, puis la disposition des salles, puis le contraste.
 * validerReglages ne juge que ce que CE changement touche (les sections qui diffèrent de `ref`, la version enregistrée) : un réglage
 * déjà enregistré ne bloque pas un autre changement ; le serveur (PUT) juge le tout. La disposition et le contraste se jugent entiers.
 */
function raisonsDe(brut: Reglages, theme: Theme | null, ref?: Reglages): string[] {
  const touchees = ref ? (Object.fromEntries(Object.entries(brut).filter(([k, x]) => stable(x) !== stable((ref as Record<string, unknown>)[k]))) as Reglages) : brut
  // `essai` est le thème du juge : le schéma l'accepte, la liste des thèmes livrés (CLES_THEME) non ; il ne se choisit jamais d'ici.
  const pour: Reglages = touchees.theme === 'essai' ? { ...touchees, theme: 'station' } : touchees
  const v = validerReglages(pour, theme)
  const raisons = v.ok ? [] : [...v.raisons]
  if (theme) {
    const placement: Record<string, string> = {}
    const plaques: Record<string, string> = {}
    for (const d of theme.defauts) placement[d.salle] = d.emplacement
    for (const [salle, s] of Object.entries(brut.salles ?? {})) {
      if (typeof s?.emplacement === 'string') placement[salle] = s.emplacement
      if (typeof s?.plaque === 'string' && s.plaque.length >= 2) plaques[salle] = s.plaque
    }
    const d = validerDisposition(theme, { salles: placement, plaques })
    if (!d.ok && !raisons.includes(d.raison)) raisons.push(d.raison)
    const c = brut.couleurs ?? {}
    if (c['--mc-texte'] || c['--mc-fond']) {
      const texte = c['--mc-texte'] ?? theme.palette['--mc-texte']
      const fond = c['--mc-fond'] ?? theme.palette['--mc-fond']
      if (RE_COULEUR.test(String(texte)) && RE_COULEUR.test(String(fond))) {
        const r = contrastRatio(texte, fond)
        if (r < CONTRASTE_MIN) raisons.push(`Le texte (${texte}) n'est pas assez lisible sur le fond (${fond}) : ${r.toFixed(1).replace('.', ',')}:1, 4,5:1 au moins`)
      }
    }
  }
  return raisons
}

/** L'état de Web Push sur CET appareil : lu dans le navigateur, sans requête. */
function etatPush(): string {
  try {
    if (typeof Notification === 'undefined') return 'indisponible sur cet appareil'
    if (Notification.permission === 'granted') return 'actives sur cet appareil'
    if (Notification.permission === 'denied') return 'refusées par ce navigateur'
    return 'pas encore activées sur cet appareil'
  } catch { return 'indisponible sur cet appareil' }
}

export default function PanneauReglages({ enregistres, theme, echecTheme, onApercu, onEnregistre, onFermer, poser }: Props) {
  const racine = useRef<HTMLDivElement>(null)
  const version = enregistres?.version ?? 0
  const sauvegarde = useMemo<Reglages>(() => (objet(enregistres?.reglages) ? (elaguer(copie(enregistres?.reglages as Reglages)) as Reglages) : {}), [enregistres])
  const [brouillon, setBrouillon] = useState<Reglages>(() => copie(sauvegarde))
  const [occupe, setOccupe] = useState(false)
  const [statut, setStatut] = useState<Statut>(null)
  const [onglet, setOnglet] = useState<string>('theme')
  const [historique, setHistorique] = useState<Version[] | null>(null)
  const [histoOuvert, setHistoOuvert] = useState(false)
  const [histoPanne, setHistoPanne] = useState<string | null>(null)
  const [echange, setEchange] = useState<{ a: string; b: string }>({ a: 'radar', b: 'repos' })
  const [push] = useState(etatPush)

  // Les réglages enregistrés arrivent après l'ouverture du panneau (la station les lit au chargement) ou changent (enregistrement, autre
  // onglet) : le brouillon est rebasé. Ce que l'utilisateur n'a pas touché suit la nouvelle version enregistrée ; ce qu'il a touché est gardé.
  const base = useRef(sauvegarde)
  useEffect(() => {
    const ancienne = base.current
    base.current = sauvegarde
    if (stable(ancienne) === stable(sauvegarde)) return
    setBrouillon((b) => elaguer(rebaser(ancienne, b, sauvegarde)) as Reglages)
  }, [sauvegarde])

  // L'aperçu : chaque changement est rendu à Habillage (rien n'est écrit) ; fermé, le panneau rend l'habit enregistré.
  useEffect(() => { onApercu(brouillon) }, [brouillon, onApercu])
  useEffect(() => () => onApercu(null), [onApercu])
  useEffect(() => { racine.current?.focus({ preventScroll: true }) }, [])
  useEffect(() => {
    const touche = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onFermer() } }
    window.addEventListener('keydown', touche)
    return () => window.removeEventListener('keydown', touche)
  }, [onFermer])

  const modifier = useCallback((f: (r: any) => void) => {
    setStatut(null)
    setBrouillon((avant) => { const n = copie(avant) as any; f(n); return elaguer(n) as Reglages })
  }, [])
  /** Pose (ou retire, si vide) une valeur à un chemin de clés. */
  const poserValeur = useCallback((chemin: string[], valeur: unknown) => modifier((r) => {
    let o = r
    for (const k of chemin.slice(0, -1)) { if (!objet(o[k])) o[k] = {}; o = o[k] }
    const derniere = chemin[chemin.length - 1]
    if (valeur === '' || valeur === undefined || valeur === null) delete o[derniere]; else o[derniere] = valeur
  }), [modifier])

  const raisons = useMemo(() => raisonsDe(brouillon, theme, sauvegarde), [brouillon, theme, sauvegarde])
  const modifie = stable(brouillon) !== stable(sauvegarde)
  const placement = useCallback((salle: string): string => brouillon.salles?.[salle]?.emplacement ?? theme?.defauts.find((d) => d.salle === salle)?.emplacement ?? salle, [brouillon, theme])
  const avatars = theme?.avatars ?? [{ cle: 'defaut', couleur: '#000000' }]

  async function ecrire(reglages: Reglages, apres?: () => void) {
    setOccupe(true); setStatut(null)
    const r = await apiDirection<{ version?: number; erreurs?: string[] }>(ADRESSE, { method: 'PUT', body: JSON.stringify({ reglages, version }) })
    setOccupe(false)
    if (r.ok && Number.isSafeInteger(r.data.version)) {
      onEnregistre({ version: r.data.version as number, reglages: copie(reglages) as Record<string, unknown>, modifie_par: null, modifie_le: new Date().toISOString() })
      setStatut({ ton: 'ok', texte: `Réglages enregistrés (version ${r.data.version}).` })
      window.dispatchEvent(new Event('station:reglages'))
      apres?.()
      if (histoOuvert) void lireHistorique()
      return
    }
    const servi = Array.isArray(r.data.erreurs) ? r.data.erreurs.join(' · ') : r.data.error
    if (r.status === 409) setStatut({ ton: 'panne', texte: servi || 'Réglages modifié ailleurs : recharge.' })
    else setStatut({ ton: 'panne', texte: servi || 'Les réglages ne sont pas enregistrés.' })
  }
  async function lireHistorique() {
    setHistoPanne(null)
    const r = await apiDirection<{ versions?: Version[] }>(`${ADRESSE}?historique=1`)
    if (r.ok && Array.isArray(r.data.versions)) setHistorique(r.data.versions.slice(0, 10))
    else { setHistorique(null); setHistoPanne(r.data.error ?? 'L’historique n’est pas disponible pour l’instant.') }
  }
  function basculerHistorique() {
    const ouvre = !histoOuvert
    setHistoOuvert(ouvre)
    if (ouvre) void lireHistorique()
  }
  function retablir(v: Version) {
    const cible = objet(v.reglages) ? (copie(v.reglages) as Reglages) : {}
    const refus = raisonsDe(cible, theme, sauvegarde)
    if (refus.length) { setStatut({ ton: 'panne', texte: `La version ${v.version} ne peut plus être rétablie : ${refus[0]}` }); return }
    void ecrire(cible, () => setBrouillon(cible))
  }
  function echanger() {
    if (echange.a === echange.b) return
    const pa = placement(echange.a), pb = placement(echange.b)
    modifier((r) => {
      for (const [salle, empl] of [[echange.a, pb], [echange.b, pa]] as const) {
        if (!objet(r.salles)) r.salles = {}
        if (!objet(r.salles[salle])) r.salles[salle] = {}
        r.salles[salle].emplacement = empl
      }
    })
  }
  /** Choisir un thème rend sa mise en page et ses emplacements (propres à chaque thème) ; les couleurs, noms et plaques réglés restent. */
  function choisirTheme(cle: string) {
    modifier((r) => {
      r.theme = cle
      delete r.mise_en_page
      if (objet(r.salles)) for (const s of Object.values(r.salles)) if (objet(s)) delete s.emplacement
    })
  }
  const aller = (cle: string) => {
    setOnglet(cle)
    racine.current?.querySelector<HTMLElement>(`[data-section="${cle}"]`)?.scrollIntoView({ block: 'start' })
  }

  const cleTheme = (typeof brouillon.theme === 'string' ? brouillon.theme : theme?.cle) ?? 'station'
  const choixThemes: string[] = [...CLES_THEME, ...(CLES_THEME.includes(cleTheme as never) ? [] : [cleTheme])]
  const emplacements = theme?.emplacements.map((e) => e.cle) ?? [...CLES_SALLE]
  const teinteDe = (salle: string) => theme?.emplacements.find((e) => e.cle === placement(salle))?.teinte ?? ''
  const peutEnregistrer = modifie && raisons.length === 0 && !echecTheme && !occupe

  const champCouleur = (cle: string, chemin: string[], defaut: string, label: string) => {
    const valeur = chemin.reduce<any>((o, k) => (objet(o) ? o[k] : undefined), brouillon)
    const v = typeof valeur === 'string' ? valeur : ''
    const effective = RE_COULEUR.test(v) ? v : RE_COULEUR.test(defaut) ? defaut : '#000000'
    return (
      <span className="mc-rg-couleur">
        <input type="text" inputMode="text" autoComplete="off" spellCheck={false} maxLength={7} placeholder={defaut || '#RRGGBB'} aria-label={label}
          data-couleur={cle} value={v} onChange={(e) => poserValeur(chemin, e.target.value.trim())} />
        <input type="color" aria-label={`${label} (sélecteur)`} data-selecteur-couleur={cle} value={effective.toLowerCase()} onChange={(e) => poserValeur(chemin, e.target.value)} />
      </span>
    )
  }

  return (
    <div ref={racine} className="mc-reglages" data-vue="reglages" role="dialog" aria-modal="true" aria-label="Réglages de la station" tabIndex={-1}>
      <header className="mc-rg-tete">
        <h2 className="mc-rg-titre">RÉGLAGES</h2>
        <button type="button" className="mc-rg-fermer" data-fermer onClick={onFermer}>Fermer</button>
      </header>
      <p className="mc-rg-aide">L’habit de la station, jamais les chiffres. Chaque changement s’applique tout de suite, sans être enregistré.</p>
      <nav className="mc-rg-onglets" role="tablist" aria-label="Sections des réglages">
        {ONGLETS.map((o) => (
          <button key={o.cle} type="button" role="tab" data-onglet={o.cle} aria-selected={onglet === o.cle} onClick={() => aller(o.cle)}>{o.libelle}</button>
        ))}
      </nav>

      <div className="mc-rg-corps">
        <section className="mc-rg-section" data-section="theme" aria-label="Thème">
          <h3>THÈME</h3>
          <label className="mc-rg-ligne"><span>Thème actif</span>
            <select data-theme-choix value={cleTheme} onChange={(e) => choisirTheme(e.target.value)}>
              {choixThemes.map((c) => <option key={c} value={c}>{c === 'station' ? 'Station' : c === 'vaisseau' ? 'Vaisseau' : c}</option>)}
            </select>
          </label>
          {echecTheme ? <p className="mc-rg-note" data-theme-indisponible>Le thème « {echecTheme} » n’est pas disponible : les couleurs d’origine de la station s’appliquent.</p> : null}
          <label className="mc-rg-ligne"><span>Mise en page</span>
            <select data-mise-en-page-choix value={brouillon.mise_en_page ?? ''} onChange={(e) => poserValeur(['mise_en_page'], e.target.value)}>
              <option value="">Celle du thème</option>
              {MISES_EN_PAGE.map((m) => <option key={m} value={m}>{m === 'colonnes' ? 'Colonnes' : 'Flottante'}</option>)}
            </select>
          </label>
          <label className="mc-rg-ligne"><span>Mode nuit</span>
            <input type="checkbox" data-nuit-actif checked={brouillon.nuit?.actif === true} onChange={(e) => poserValeur(['nuit', 'actif'], e.target.checked)} />
          </label>
          <div className="mc-rg-ligne"><span>Heures de la nuit</span>
            <span className="mc-rg-paire">
              <select aria-label="Début de la nuit" data-nuit-debut value={String(brouillon.nuit?.debut ?? 22)} onChange={(e) => poserValeur(['nuit', 'debut'], Number(e.target.value))}>
                {HEURES.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')} h</option>)}
              </select>
              <span aria-hidden="true">→</span>
              <select aria-label="Fin de la nuit" data-nuit-fin value={String(brouillon.nuit?.fin ?? 6)} onChange={(e) => poserValeur(['nuit', 'fin'], Number(e.target.value))}>
                {HEURES.map((h) => <option key={h} value={h}>{String(h).padStart(2, '0')} h</option>)}
              </select>
            </span>
          </div>
        </section>

        <section className="mc-rg-section" data-section="equipage" aria-label="Équipage">
          <h3>ÉQUIPAGE</h3>
          <p className="mc-rg-note">Le nom affiché, l’avatar et la couleur. Le nom technique de l’agent ne change jamais.</p>
          <ul className="mc-rg-liste" data-groupe="equipage">
            {Object.entries(EQUIPAGE).map(([nom, a]) => {
              const r = brouillon.equipage?.[nom] ?? {}
              const avatarParDefaut = avatars.some((x) => x.cle === nom) ? nom : 'defaut'
              const couleurParDefaut = avatars.find((x) => x.cle === (r.avatar ?? avatarParDefaut))?.couleur ?? ''
              return (
                <li key={nom} data-agent={nom}>
                  <span className="mc-rg-nom">{a.libelle} <small>({nom})</small></span>
                  <input type="text" maxLength={16} placeholder={a.libelle} aria-label={`Nom affiché de ${a.libelle}`} data-agent-nom={nom} value={r.nom ?? ''} onChange={(e) => poserValeur(['equipage', nom, 'nom'], e.target.value)} />
                  <select aria-label={`Avatar de ${a.libelle}`} data-agent-avatar={nom} value={r.avatar ?? avatarParDefaut} onChange={(e) => poserValeur(['equipage', nom, 'avatar'], e.target.value === avatarParDefaut ? '' : e.target.value)}>
                    {avatars.map((x) => <option key={x.cle} value={x.cle}>{x.cle}</option>)}
                  </select>
                  {champCouleur(`agent:${nom}`, ['equipage', nom, 'couleur'], couleurParDefaut, `Couleur de ${a.libelle}`)}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="mc-rg-section" data-section="salles" aria-label="Salles">
          <h3>SALLES</h3>
          <p className="mc-rg-note">On renomme, on déplace, on recolore : on ne cache aucune salle. La salle réservée E-commerce ne bouge pas.</p>
          <div className="mc-rg-echange" data-groupe="echange">
            <select aria-label="Première salle à échanger" data-echange-a value={echange.a} onChange={(e) => setEchange((x) => ({ ...x, a: e.target.value }))}>
              {CLES_SALLE.map((c) => <option key={c} value={c}>{PLAQUE_DE[c] ?? c}</option>)}
            </select>
            <span aria-hidden="true">⇄</span>
            <select aria-label="Seconde salle à échanger" data-echange-b value={echange.b} onChange={(e) => setEchange((x) => ({ ...x, b: e.target.value }))}>
              {CLES_SALLE.map((c) => <option key={c} value={c}>{PLAQUE_DE[c] ?? c}</option>)}
            </select>
            <button type="button" className="mc-rg-bouton" disabled={echange.a === echange.b} onClick={echanger}>Échanger</button>
          </div>
          <ul className="mc-rg-liste" data-groupe="salles">
            {[...SALLES, SALLE_RESERVEE].map((s) => {
              const r = brouillon.salles?.[s.cle] ?? {}
              return (
                <li key={s.cle} data-salle={s.cle}>
                  <span className="mc-rg-nom">{s.plaque}</span>
                  <input type="text" maxLength={24} placeholder={s.plaque} aria-label={`Plaque de la salle ${s.plaque}`} data-salle-plaque={s.cle} value={r.plaque ?? ''} onChange={(e) => poserValeur(['salles', s.cle, 'plaque'], e.target.value)} />
                  <select aria-label={`Emplacement de la salle ${s.plaque}`} data-salle-emplacement={s.cle} value={placement(s.cle)} onChange={(e) => poserValeur(['salles', s.cle, 'emplacement'], e.target.value === theme?.defauts.find((d) => d.salle === s.cle)?.emplacement ? '' : e.target.value)}>
                    {emplacements.map((c) => <option key={c} value={c}>{PLAQUE_DE[c] ?? c}</option>)}
                  </select>
                  {champCouleur(`salle:${s.cle}`, ['salles', s.cle, 'teinte'], teinteDe(s.cle), `Teinte de la salle ${s.plaque}`)}
                </li>
              )
            })}
          </ul>
        </section>

        <section className="mc-rg-section" data-section="couleurs" aria-label="Couleurs">
          <h3>COULEURS</h3>
          <p className="mc-rg-note">Un jeton à la fois, au format #RRGGBB. Le texte doit rester lisible sur le fond (4,5:1 au moins).</p>
          <ul className="mc-rg-liste" data-groupe="couleurs">
            {JETONS_PALETTE.map((j) => (
              <li key={j} data-jeton={j}>
                <span className="mc-rg-nom">{LIBELLE_JETON[j] ?? j} <small>{j}</small></span>
                {champCouleur(j, ['couleurs', j], theme?.palette[j] ?? '', `Couleur du jeton ${LIBELLE_JETON[j] ?? j}`)}
              </li>
            ))}
          </ul>
        </section>

        <section className="mc-rg-section" data-section="affichage" aria-label="Affichage">
          <h3>AFFICHAGE</h3>
          <label className="mc-rg-ligne"><span>Titre de la station</span>
            <input type="text" maxLength={32} placeholder="PRESTI · MISSION CONTROL" data-affichage-titre value={brouillon.affichage?.titre ?? ''} onChange={(e) => poserValeur(['affichage', 'titre'], e.target.value)} />
          </label>
          <label className="mc-rg-ligne"><span>Taille des plaques</span>
            <select data-affichage-taille value={brouillon.affichage?.taille_plaques ?? ''} onChange={(e) => poserValeur(['affichage', 'taille_plaques'], e.target.value)}>
              <option value="">Normale</option>
              {TAILLES_PLAQUES.filter((t) => t !== 'normale').map((t) => <option key={t} value={t}>{t === 'petite' ? 'Petite' : 'Grande'}</option>)}
            </select>
          </label>
        </section>

        <section className="mc-rg-section" data-section="notifications" aria-label="Notifications">
          <h3>NOTIFICATIONS</h3>
          <p className="mc-rg-note" data-etat-push>Les notifications Web Push sont {push}. Cet état se lit dans le navigateur ; il ne se change pas d’ici.</p>
          <button type="button" className="mc-rg-bouton" onClick={() => poser({ vue: 'aide' })}>Voir la procédure</button>
        </section>
      </div>

      {raisons.length ? (
        <ul className="mc-rg-raisons" data-raisons role="alert" aria-label="Pourquoi ces réglages sont refusés">
          {raisons.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      ) : null}
      {statut ? <p className={`mc-rg-statut${statut.ton === 'panne' ? ' mc-panne' : ''}`} data-message role={statut.ton === 'panne' ? 'alert' : 'status'}>{statut.texte}</p> : null}

      {histoOuvert ? (
        <section className="mc-rg-histo" data-historique aria-label="Historique des réglages">
          <h3>HISTORIQUE</h3>
          {histoPanne ? <p className="mc-etat" data-message>{histoPanne}</p> : null}
          {historique && historique.length === 0 ? <p className="mc-etat">Aucune version enregistrée.</p> : null}
          <ul className="mc-rg-liste">
            {(historique ?? []).map((v) => (
              <li key={v.version} data-version={v.version}>
                <span className="mc-rg-nom">Version {v.version}</span>
                <small>{v.modifie_par ? `par ${v.modifie_par.slice(0, 8)}` : 'auteur inconnu'} · {quand(v.modifie_le)}</small>
                <button type="button" className="mc-rg-bouton" disabled={occupe} onClick={() => retablir(v)}>Rétablir</button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <footer className="mc-rg-pied">
        <button type="button" className="mc-rg-bouton mc-rg-principal" disabled={!peutEnregistrer} onClick={() => void ecrire(brouillon)}>Enregistrer</button>
        <button type="button" className="mc-rg-bouton" onClick={() => { setBrouillon(copie(sauvegarde)); setStatut(null) }}>Annuler</button>
        <button type="button" className="mc-rg-bouton" onClick={() => { setBrouillon(typeof brouillon.theme === 'string' ? { theme: brouillon.theme } : {}); setStatut(null) }}>Revenir au thème par défaut</button>
        <button type="button" className="mc-rg-bouton" aria-expanded={histoOuvert} onClick={basculerHistorique}>Historique</button>
        <small className="mc-rg-version" data-version-lue={version}>version {version}</small>
      </footer>
    </div>
  )
}
