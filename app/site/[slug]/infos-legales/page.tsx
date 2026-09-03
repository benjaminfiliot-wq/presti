import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { resolveStyle, styleToCss, styleToData } from '@/lib/siteStyle'
import { lisibleSur } from '@/lib/contrast'
import { fondDuTheme } from '@/lib/themeFonds'
import { mentionsObligatoires, TRAITEMENTS, SOUS_TRAITANTS, type ArtisanLegal } from '@/lib/legalArtisan'

// Mentions légales et confidentialité de L'ARTISAN (correctif d'audit du 2026-09-03).
//
// Pourquoi cette page existe : le site vitrine et la plateforme de contact n'avaient
// aucune existence juridique. Un site professionnel doit porter les mentions de la LCEN,
// et la plateforme collecte des données personnelles (jusqu'à des photos de domicile)
// sans en informer personne. C'est l'ARTISAN qui est responsable de traitement : c'est
// lui que la CNIL sanctionnerait, pour un site que Presti a produit.
//
// Deux principes :
//  • Elle est servie même si le site n'est pas publié — une obligation légale ne dépend
//    pas d'un réglage marketing.
//  • Aucune donnée inventée. Un champ non renseigné est signalé comme manquant, pas
//    comblé par une formule creuse : mieux vaut une mention absente et visible qu'une
//    mention fausse.

export const revalidate = 3600

type Artisan = ArtisanLegal & {
  id: string; slug: string | null; accent: string | null; theme: string | null
  site_style: unknown; plateforme_active: boolean | null
}

async function getArtisan(slug: string): Promise<Artisan | null> {
  const { data } = await supabaseAdmin.from('artisans')
    .select('id, nom, metier, slug, forme_juridique, siret, adresse, code_postal, ville, tel_public, email_public, tva_num, assurance_nom, assurance_contrat, assurance_activites, assurance_zone, zone_intervention, accent, theme, site_style, plateforme_active')
    .eq('slug', slug).maybeSingle()
  return (data as Artisan) ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const a = await getArtisan(slug)
  if (!a) return { title: { absolute: 'Page introuvable' }, robots: { index: false } }
  return {
    title: { absolute: `Informations légales — ${a.nom ?? 'Artisan'}` },
    description: `Mentions légales et protection des données de ${a.nom ?? 'cet artisan'}.`,
    applicationName: a.nom || undefined,
    authors: a.nom ? [{ name: a.nom }] : undefined,
    keywords: [a.metier, 'mentions légales'].filter(Boolean) as string[],
    alternates: { canonical: `https://prestiapp.fr/site/${slug}/infos-legales` },
    robots: { index: true, follow: true },
    openGraph: { title: `Informations légales — ${a.nom ?? 'Artisan'}`, type: 'website', url: `https://prestiapp.fr/site/${slug}/infos-legales`, ...(a.nom ? { siteName: a.nom } : {}) },
  }
}

export default async function InfosLegales({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const a = await getArtisan(slug)
  if (!a) notFound()

  const accent = /^#[0-9a-fA-F]{6}$/.test(a.accent || '') ? (a.accent as string) : '#D97757'
  const theme = ['atelier', 'nuit', 'epure', 'chantier', 'bleu', 'vitrine'].includes(a.theme || '') ? (a.theme as string) : 'atelier'
  const style = resolveStyle(a.site_style)
  const mentions = mentionsObligatoires(a)
  const contactArtisan = a.email_public || a.tel_public

  return (
    <main
      className="site tier-1"
      style={{ ['--pc' as string]: accent, ['--pc-ink' as string]: lisibleSur(style.accent2 || accent, style.fond || fondDuTheme(theme)), ...styleToCss(style) }}
      data-theme={theme}
      {...styleToData(style)}
    >
      <nav className="site-nav">
        <a className="site-brand" href={`/site/${slug}`}>{a.nom}</a>
        <div className="site-links"><a href={`/site/${slug}`}>← Retour au site</a></div>
      </nav>

      <div className="site-block">
        <div className="site-head">
          <span className="site-kick">Informations légales</span>
          <h2>Qui je suis, et ce que deviennent vos données</h2>
        </div>

        <section className="legal-bloc">
          <h3>Mentions légales</h3>
          <dl className="legal-dl">
            {mentions.map((m) => (
              <div key={m.cle}>
                <dt>{m.label}</dt>
                <dd>
                  {m.valeur ?? (
                    // On ne fabrique pas une mention manquante : on le dit.
                    <em className="legal-manque">non communiqué{m.obligatoire ? ' — information obligatoire' : ''}</em>
                  )}
                </dd>
              </div>
            ))}
            <div>
              <dt>Directeur de la publication</dt>
              <dd>{a.nom ?? <em className="legal-manque">non communiqué</em>}</dd>
            </div>
            <div>
              <dt>Hébergement</dt>
              <dd>Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis</dd>
            </div>
          </dl>
          <p className="legal-note">
            En cas de litige, vous pouvez recourir gratuitement à un médiateur de la consommation.
            {contactArtisan ? <> Contactez-moi d’abord à <b>{contactArtisan}</b> : la plupart des situations se règlent directement.</> : null}
          </p>
        </section>

        <section className="legal-bloc">
          <h3>Vos données personnelles</h3>
          <p>
            Quand vous me contactez{a.plateforme_active !== false ? ' via ce site' : ''}, je recueille des informations sur vous.
            Voici lesquelles, pourquoi, combien de temps — et ce que vous pouvez exiger.
            Le responsable de ces traitements, c’est moi{a.nom ? `, ${a.nom}` : ''}.
          </p>

          <table className="legal-table">
            <thead><tr><th>Pourquoi</th><th>Quelles informations</th><th>À quel titre</th><th>Combien de temps</th></tr></thead>
            <tbody>
              {TRAITEMENTS.map((t, i) => (
                <tr key={i}><td>{t.finalite}</td><td>{t.donnees}</td><td>{t.base}</td><td>{t.duree}</td></tr>
              ))}
            </tbody>
          </table>

          <h4>Qui d’autre y a accès</h4>
          <p>Personne d’autre que moi et les prestataires techniques dont je me sers pour faire fonctionner ce site :</p>
          <ul className="legal-liste">
            {SOUS_TRAITANTS.map((s) => (
              <li key={s.nom}><b>{s.nom}</b> — {s.role}. <span className="legal-lieu">{s.lieu}</span></li>
            ))}
          </ul>
          <p className="legal-note">
            Vos informations ne sont ni vendues, ni louées, ni utilisées pour de la publicité.
          </p>

          <h4>Vos droits</h4>
          <p>
            Vous pouvez à tout moment demander à consulter ce que j’ai sur vous, le faire corriger, le faire
            supprimer, ou vous opposer à son utilisation.
            {contactArtisan
              ? <> Écrivez-moi à <b>{contactArtisan}</b> : je réponds sous un mois.</>
              : <> Contactez-moi par le moyen indiqué sur ce site : je réponds sous un mois.</>}
            {' '}Si ma réponse ne vous convient pas, vous pouvez saisir la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener">cnil.fr</a>).
          </p>

          <h4>Photos</h4>
          <p>
            Les photos que vous m’envoyez servent uniquement à comprendre votre chantier et à le chiffrer.
            Les informations de localisation qu’elles contiennent sont <b>retirées automatiquement</b> avant
            l’enregistrement, et elles ne sont accessibles qu’à moi.
          </p>

          <h4>Cookies</h4>
          <p>
            Ce site ne dépose aucun cookie publicitaire et ne vous suit sur aucun autre site.
            Seules les informations strictement nécessaires au fonctionnement de la conversation sont conservées
            dans votre navigateur.
          </p>
        </section>
      </div>

      <footer className="site-foot">
        <span className="site-foot-b">{a.nom}</span>
        <span>{a.metier}{a.zone_intervention ? ` · ${a.zone_intervention}` : ''}</span>
      </footer>
    </main>
  )
}
