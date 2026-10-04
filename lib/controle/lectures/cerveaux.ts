// Vient de app/api/controle/cerveaux/route.ts : pour chaque dossier lib/ai/cerveaux/<cerveau>/, le dernier score accepté,
// le nombre de cas et d'ouverts, la dernière entrée du journal. Lu depuis les fichiers versionnés : c'est le code déployé qui parle.
import fs from 'node:fs'
import path from 'node:path'

export type Cerveau = {
  id: string
  score: number | null
  reussis: number | null
  total: number | null
  date: string | null
  cas: number
  ouverts: number
  derniereEntree: string | null
}

export function cerveaux(): Cerveau[] {
  const racine = path.join(process.cwd(), 'lib', 'ai', 'cerveaux')
  let dossiers: string[] = []
  try { dossiers = fs.readdirSync(racine, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort() } catch { dossiers = [] }
  return dossiers.map((id) => {
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
      const m = [...fs.readFileSync(path.join(d, 'journal.md'), 'utf8').matchAll(/^## (.+)$/gm)].at(-1) // la DERNIÈRE entrée, pas la première
      derniereEntree = m ? m[1].trim().slice(0, 160) : null
    } catch { /* pas de journal */ }
    return { id, score: score?.score ?? null, reussis: score?.reussis ?? null, total: score?.total ?? null, date: score?.date ?? null, cas, ouverts, derniereEntree }
  })
}
