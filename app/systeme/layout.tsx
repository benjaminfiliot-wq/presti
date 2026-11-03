import { notFound } from 'next/navigation'
import { actif } from '@/lib/flags'
import './systeme.css'

// Le système d'assistants (prompt 6, lot 036-011). Drapeau `systemeAgents` baissé : 404, rien dans le DOM. L'accueil actuel
// (app/dashboard) et le CRM (app/crm) ne changent pas : ces écrans s'ajoutent à côté, derrière le drapeau.
export default function Layout({ children }: { children: React.ReactNode }) {
  if (!actif('systemeAgents')) notFound()
  return <div className="sys">{children}</div>
}
