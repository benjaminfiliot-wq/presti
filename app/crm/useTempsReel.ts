'use client'

// CRM — la liaison Supabase Realtime (postgres_changes) de l'écran. Les tables, le filtre de compte et le regroupement des rafales
// sont dans lib/crm/tempsReel.ts (pur, testé) ; ce hook ne fait que brancher.
//
// Un évènement ne porte aucune valeur à l'écran : il déclenche UNE relecture de GET /api/crm/vue (regroupée), donc chaque chiffre
// reste celui du calcul serveur. Filet de sécurité : une relecture toutes les 60 s tant que l'onglet est visible — elle couvre les
// suppressions (Supabase n'envoie pas les DELETE filtrés par compte, voir la migration 0158) et une coupure que le navigateur n'a
// pas vue. Au retour d'une coupure, le hook relit aussitôt : rien de ce qui s'est passé pendant ne manque.
import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { abonnements, creerRafale, LIBELLE_TABLE, type TableTempsReel } from '@/lib/crm/tempsReel'

export type LienTempsReel = 'connexion' | 'direct' | 'coupe'
export type Dernier = { table: TableTempsReel; libelle: string; a: number }

export function useTempsReel({ uid, actif, surChangement }: { uid: string | null; actif: boolean; surChangement: () => void }): { lien: LienTempsReel; dernier: Dernier | null } {
  const [lien, setLien] = useState<LienTempsReel>('connexion')
  const [dernier, setDernier] = useState<Dernier | null>(null)
  // Le rappel le plus récent, sans réabonner le canal à chaque rendu.
  const rappel = useRef(surChangement)
  useEffect(() => { rappel.current = surChangement }, [surChangement])

  useEffect(() => {
    if (!uid || !actif) { setLien('connexion'); return }
    const liste = abonnements(uid)
    if (!liste.length) return
    const rafale = creerRafale(() => rappel.current())
    let aEteCoupe = false
    const canal = supabase.channel(`crm:${uid}`)
    for (const a of liste) {
      canal.on('postgres_changes', { event: a.event, schema: a.schema, table: a.table, filter: a.filter }, () => {
        setDernier({ table: a.table, libelle: LIBELLE_TABLE[a.table], a: Date.now() })
        rafale.signaler()
      })
    }
    canal.subscribe((statut) => {
      if (statut === 'SUBSCRIBED') {
        setLien('direct')
        if (aEteCoupe) { aEteCoupe = false; rafale.signaler() } // rattrapage : ce qui a bougé pendant la coupure
      } else if (statut === 'CHANNEL_ERROR' || statut === 'TIMED_OUT' || statut === 'CLOSED') {
        aEteCoupe = true
        setLien('coupe')
      }
    })
    const filet = setInterval(() => { if (document.visibilityState === 'visible') rafale.signaler() }, 60_000)
    return () => { clearInterval(filet); rafale.annuler(); void supabase.removeChannel(canal) }
  }, [uid, actif])

  return { lien, dernier }
}
