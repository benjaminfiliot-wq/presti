// 026-143 — la page d'essai du porteur du formulaire (026-095) : un formulaire de contact ORDINAIRE, sans aucune
// protection (ni captcha, ni pot de miel, ni jeton), sur lequel le porteur s'essaie, jamais sur le site d'un vrai
// artisan. Le message reçu n'est jamais gardé : seule son empreinte SHA-256 l'est (envoi/route.ts).
// Derrière le drapeau `essaiFormulaire` : baissé, la page répond 404. Aucun lien depuis le reste du site.
import { notFound } from 'next/navigation'
import { actif } from '@/lib/flags'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Contact',
  robots: { index: false, follow: false },
}

export default function EssaiFormulaire() {
  if (!actif('essaiFormulaire')) notFound()
  return (
    <main style={{ maxWidth: 560, margin: '40px auto', padding: '0 16px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Contact</h1>
      <form method="post" action="/essai-formulaire/envoi">
        <p>
          <label>
            Nom
            <br />
            <input type="text" name="nom" required style={{ width: '100%' }} />
          </label>
        </p>
        <p>
          <label>
            E-mail
            <br />
            <input type="email" name="email" required style={{ width: '100%' }} />
          </label>
        </p>
        <p>
          <label>
            Téléphone
            <br />
            <input type="tel" name="telephone" style={{ width: '100%' }} />
          </label>
        </p>
        <p>
          <label>
            Sujet
            <br />
            <input type="text" name="sujet" style={{ width: '100%' }} />
          </label>
        </p>
        <p>
          <label>
            Message
            <br />
            <textarea name="message" required maxLength={2000} rows={6} style={{ width: '100%' }} />
          </label>
        </p>
        <p>
          <button type="submit">Envoyer</button>
        </p>
      </form>
    </main>
  )
}
