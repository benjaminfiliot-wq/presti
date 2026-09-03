-- v4 §16.5 — Médiateur de la consommation (art. L.616-1 du code de la consommation).
--
-- Tout professionnel qui vend à des particuliers doit adhérer à un dispositif de médiation
-- et en communiquer les coordonnées sur son site et ses devis. L'absence de cette mention
-- est passible d'une amende administrative (jusqu'à 15 000 € pour une personne morale).
--
-- Choix assumé : on stocke ce que l'artisan déclare, on n'en invente pas. Une page
-- juridique qui évoque « un médiateur » sans le nommer ne vaut rien — c'est même une
-- affirmation non fondée de plus.
alter table public.artisans
  add column if not exists mediateur_nom text,
  add column if not exists mediateur_url  text;

comment on column public.artisans.mediateur_nom is
  'Dispositif de médiation de la consommation auquel l''artisan adhère (art. L.616-1 c. conso). Affiché sur ses mentions légales et ses devis. NULL = non déclaré, signalé comme manquant.';
