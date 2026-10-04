'use client'

// La SEULE porte du moteur de la carte (fiche 026-179, K1) : Carte.tsx charge ce module, par next/dynamic sans rendu serveur, et lui seul.
// Il reçoit les propriétés de la carte (`equipage`, `tapis`, `bulles`, `reglages`, `carte`), monte l'hôte de claw3d/ avec la scène de scene/,
// et appelle les ACCROCHES, dans l'ordre. Les fiches K2 à K5 n'écrivent jamais dans claw3d/ : elles ajoutent leur dossier sous moteur/ et
// branchent leur module ici, en remplaçant le `null` de leur accroche. Une accroche absente (null) ne casse rien.
//
// Les accroches `theme`, `adaptateur` et `scene` passent AVANT la construction du jeu : elles peuvent remplacer `grille`, `fabrique` ou
// `placer` du contexte (le thème donne la grille, la scène un décor et des emplacements). Les accroches `camera`, `acteurs`, `calque` et
// `telephone` passent APRÈS : `contexte.jeu` est alors le jeu Phaser construit. Chacune peut rendre une fonction qui défait ce qu'elle a posé.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { OfficePhaserCanvas } from './claw3d/OfficePhaserCanvas'
import { OfficeSceneBridge } from './claw3d/OfficeSceneBridge'
import { accrocheAdaptateur } from './adaptateur'
import { accrocheCalque } from './calque'
import { accrocheScene } from './scene'
import { createStationPixelScene } from './scene/StationPixelScene'
import { dispositionDe, versCarteMoteur } from './theme/carte'
import { chargerTheme } from './theme/charger'
import { marcheDe, poserMonde } from './theme/grille'
import type { Accroche, Accroches, ActeurStation, ContexteMoteur, Grille, PropsCarte } from './types'

/** La grille logique tant qu'aucun thème n'en donne une (K2) : 480 × 300 pixels, celle de l'atelier. */
export const GRILLE_PAR_DEFAUT: Grille = { largeur: 480, hauteur: 300 }

/**
 * K2 a branché `theme`. K3 (026-181) a branché `adaptateur` (les acteurs d'après `positions()`, le pont appelé sur une signature qui change) et
 * `scene` (la scène de la station : marche, halo, antenne, nuit) ; le calque HTML (miroir, bulle, « Zz ») est branché par la même fiche.
 * K4a branche `camera`, K4b `acteurs`, K4c `telephone` (vides : null).
 *
 * `theme` charge le thème des réglages (« station » à défaut), le valide, en tire la carte du moteur (bureau, ou portrait sous 1024 px
 * comme la station) et sa grille de marche, les range pour les accroches suivantes (mondeDe(contexte), moteur/theme/grille.ts) et pose
 * la grille logique du dessin. Un thème refusé jette : l'hôte reste au cadre d'attente avec la raison, jamais une page blanche.
 */
export const ACCROCHES: Accroches = {
  theme: async (contexte) => {
    const reglages = contexte.props.reglages?.reglages
    const charge = await chargerTheme(reglages?.theme ?? 'station')
    if (!charge.ok) throw new Error(charge.raison)
    const { disposition, teintes } = dispositionDe(charge.theme, reglages)
    const portrait = !window.matchMedia('(min-width: 1024px)').matches
    const carte = versCarteMoteur(charge.theme, disposition, portrait, teintes)
    poserMonde(contexte, { carte, marche: marcheDe(carte) })
    contexte.grille = { largeur: carte.canvas.width, hauteur: carte.canvas.height }
    // Le placeur par défaut : une salle, son poste. La scène (K3) et les acteurs (K4b) posent le leur, qui répartit ceux d'une même salle.
    contexte.placer = (acteur) => (acteur.salle ? carte.postes[acteur.salle] ?? null : null)
  },
  adaptateur: accrocheAdaptateur,
  scene: accrocheScene,
  camera: null,
  acteurs: null,
  calque: accrocheCalque,
  telephone: null,
}

/** Ce que les accroches `theme`, `adaptateur` et `scene` ont décidé, et sur quoi le jeu se construit. */
type Pret = Pick<ContexteMoteur, 'grille' | 'fabrique' | 'placer'>

const AVANT: (keyof Accroches)[] = ['theme', 'adaptateur', 'scene']
const APRES: (keyof Accroches)[] = ['camera', 'acteurs', 'calque', 'telephone']

/** Appelle chaque accroche présente, dans l'ordre ; une accroche qui échoue est signalée, les suivantes passent quand même. */
async function appeler(noms: (keyof Accroches)[], contexte: ContexteMoteur, defaire: (() => void)[], annule: () => boolean) {
  for (const nom of noms) {
    const accroche: Accroche | null = ACCROCHES[nom]
    if (!accroche || annule()) continue
    try {
      const retour = await accroche(contexte)
      if (typeof retour === 'function') defaire.push(retour)
    } catch (e) {
      // Sans thème il n'y a pas de carte : le refus remonte jusqu'au cadre d'attente. Toute autre accroche qui échoue est signalée seulement.
      if (nom === 'theme') throw e
      console.error(`carte de la station : l'accroche « ${nom} » a échoué`, e)
    }
  }
}

export default function Entree(props: PropsCarte) {
  const pont = useMemo(() => new OfficeSceneBridge<ActeurStation>(), [])
  const dernieres = useRef(props)
  dernieres.current = props
  const suiveurs = useRef<((p: PropsCarte) => void)[]>([])
  const contexte = useRef<ContexteMoteur | null>(null)
  const defaire = useRef<(() => void)[]>([])
  const [pret, setPret] = useState<Pret | null>(null)
  const [raison, setRaison] = useState<string | null>(null)

  // Avant le jeu : le contexte, puis les accroches `theme`, `adaptateur` et `scene`. Le jeu se construit ensuite, sur la grille retenue.
  useEffect(() => {
    let annule = false
    const c: ContexteMoteur = {
      props: dernieres.current,
      grille: GRILLE_PAR_DEFAUT,
      pont,
      fabrique: createStationPixelScene,
      placer: () => null,
      jeu: null,
      racine: null,
      ecouter: (suivre) => { suiveurs.current.push(suivre) },
    }
    contexte.current = c
    void (async () => {
      try {
        await appeler(AVANT, c, defaire.current, () => annule)
        if (!annule) setPret({ grille: c.grille, fabrique: c.fabrique, placer: c.placer })
      } catch (e) {
        if (!annule) setRaison(e instanceof Error ? e.message : 'La carte est indisponible.')
      }
    })()
    return () => {
      annule = true
      contexte.current = null
      suiveurs.current = []
      for (const f of defaire.current.splice(0).reverse()) f()
    }
  }, [pont])

  // Chaque rendu : les suiveurs enregistrés par les accroches reçoivent les propriétés. Aucun n'est enregistré à la fiche K1 ; c'est à
  // chacun de comparer (la signature des acteurs) : le pont n'est appelé que sur un vrai changement, jamais à chaque lecture des vues.
  useEffect(() => {
    if (contexte.current) contexte.current.props = props
    for (const suivre of suiveurs.current) suivre(props)
  })

  // Après le jeu : les accroches `camera`, `acteurs`, `calque` et `telephone`, avec le jeu construit.
  const auJeu = useCallback((jeu: NonNullable<ContexteMoteur['jeu']>) => {
    const c = contexte.current
    if (!c) return
    c.jeu = jeu
    c.racine = jeu.canvas?.parentElement ?? null
    void appeler(APRES, c, defaire.current, () => contexte.current !== c)
  }, [])

  if (raison) return <p role="status" className="mc-carte-attente" data-station-attente>La carte est en attente : {raison}</p>
  if (!pret) return null
  return <OfficePhaserCanvas pont={pont} grille={pret.grille} fabrique={pret.fabrique} placer={pret.placer} auJeu={auJeu} />
}
