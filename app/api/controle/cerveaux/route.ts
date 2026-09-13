// GET /api/controle/cerveaux
// Le tableau des cerveaux (v15 §8.3) : pour chaque dossier lib/ai/cerveaux/<cerveau>/, le dernier score accepté
// (score.json), le nombre de cas et d'ouverts (cas.jsonl), et la dernière entrée du journal (journal.md). Lu depuis les
// fichiers versionnés — c'est le code déployé qui parle, pas une table. Lisible par les deux rôles (domaine « journal »,
// verbe « voir » : c'est de la lecture d'état, pas des données d'artisans).
import { NextResponse } from 'next/server'
import fs from 'node:fs'
import path from 'node:path'
import { estFondateur, estRefus, reponseRefus, exigerDomaine, domaineRefuse } from '@/lib/direction/garde'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Cerveau = {
  id: string
  score: number | null
  reussis: number | null
  total: number | null
  date: string | null
  cas: number
  ouverts: number
  derniereEntree: string | null
}

export async function GET(req: Request) {
  const f = await estFondateur(req)
  if (estRefus(f)) return reponseRefus(f)
  const perimetre = exigerDomaine(f, 'journal', 'voir')
  if (domaineRefuse(perimetre)) return reponseRefus(perimetre)
  const racine = path.join(process.cwd(), 'lib', 'ai', 'cerveaux')
  let dossiers: string[] = []
  try { dossiers = fs.readdirSync(racine, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort() } catch { dossiers = [] }
  const cerveaux: Cerveau[] = dossiers.map((id) => {
    const d = path.join(racine, id)
    const lireJson = (nom: string) => { try { return JSON.parse(fs.readFileSync(path.join(d, nom), 'utf8')) } catch { return null } }
    const score = lireJson('score.json') as { score?: number; reussis?: number; total?: number; date?: string } | null
    let cas = 0, ouverts = 0
    try {
      for (const l of fs.readFileSync(path.join(d, 'cas.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean)) {
        cas++
        try { if (JSON.parse(l).statut === 'ouvert') ouverts++ } catch { /* ligne abîmée : comptée, pas lue */ }
      }
    } catch { /* pas de cas */ }
    let derniereEntree: string | null = null
    try {
      const m = fs.readFileSync(path.join(d, 'journal.md'), 'utf8').match(/^## (.+)$/m)
      derniereEntree = m ? m[1].trim().slice(0, 160) : null
    } catch { /* pas de journal */ }
    return { id, score: score?.score ?? null, reussis: score?.reussis ?? null, total: score?.total ?? null, date: score?.date ?? null, cas, ouverts, derniereEntree }
  })
  return NextResponse.json({ cerveaux })
}
