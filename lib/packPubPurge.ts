import { supabaseAdmin } from '@/lib/supabaseAdmin'

type PackPurge = {
  id: string
  etat: string
  lien_expire_le: string | null
  fichiers_effaces_le: string | null
}

type BilanPurge = { effaces: number; fichiers: number; erreurs: string[] }

export function packsAPurger<T extends PackPurge>(lignes: T[], maintenant: Date | string): T[] {
  const date = new Date(maintenant).getTime()
  if (!Number.isFinite(date)) return []
  return lignes
    .filter((pack) => pack.etat === 'livree'
      && pack.fichiers_effaces_le === null
      && pack.lien_expire_le !== null
      && Number.isFinite(new Date(pack.lien_expire_le).getTime())
      && new Date(pack.lien_expire_le).getTime() < date)
    .sort((a, b) => new Date(a.lien_expire_le!).getTime() - new Date(b.lien_expire_le!).getTime())
    .slice(0, 20)
}

export async function purgerPacksExpires(maintenant = new Date()): Promise<BilanPurge> {
  const bilan = { effaces: 0, fichiers: 0, erreurs: [] as string[] }
  try {
    const date = maintenant.toISOString()
    const { data, error } = await supabaseAdmin.from('packs_pubs')
      .select('id, etat, lien_expire_le, fichiers_effaces_le')
      .eq('etat', 'livree')
      .is('fichiers_effaces_le', null)
      .lt('lien_expire_le', date)
      .order('lien_expire_le', { ascending: true })
      .limit(20)
    if (error) { bilan.erreurs.push(`lecture : ${error.message}`); return bilan }

    for (const pack of packsAPurger(data ?? [], maintenant)) {
      try {
        const prefixe = `packs-pubs/${pack.id}`
        const stockage = supabaseAdmin.storage.from('packs-pubs')
        const { data: objets, error: erreurListe } = await stockage.list(prefixe, { limit: 101 })
        if (erreurListe) { bilan.erreurs.push(`${pack.id} : liste : ${erreurListe.message}`); continue }
        if (!objets || objets.length > 100 || objets.some((objet) => objet.id === null)) {
          bilan.erreurs.push(`${pack.id} : liste incomplète ou sous-dossier inattendu`)
          continue
        }
        const chemins = objets.map((objet) => `${prefixe}/${objet.name}`)
        if (chemins.length) {
          const { error: erreurRetrait } = await stockage.remove(chemins)
          if (erreurRetrait) { bilan.erreurs.push(`${pack.id} : retrait : ${erreurRetrait.message}`); continue }
          bilan.fichiers += chemins.length
        }
        const { data: marques, error: erreurMaj } = await supabaseAdmin.from('packs_pubs')
          .update({ fichiers_effaces_le: date })
          .eq('id', pack.id)
          .eq('etat', 'livree')
          .lt('lien_expire_le', date)
          .is('fichiers_effaces_le', null)
          .select('id')
        if (erreurMaj) { bilan.erreurs.push(`${pack.id} : marquage : ${erreurMaj.message}`); continue }
        bilan.effaces += marques?.length ?? 0
      } catch (e) {
        bilan.erreurs.push(`${pack.id} : ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  } catch (e) {
    bilan.erreurs.push(`purge : ${e instanceof Error ? e.message : String(e)}`)
  }
  return bilan
}
