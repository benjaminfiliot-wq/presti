-- 0196 — La clé propre à n8n (BOITE_CLE_N8N) gardée dans le coffre de Supabase (Vault), lue par n8n par une fonction
-- (choix A de Benj, 03/11/2026 au soir).
-- Pourquoi : n8n 2.x refuse à ses nœuds Code l'accès aux variables d'environnement (« access to env vars denied », 036-032,
-- exécution 1177). Ouvrir cet accès (N8N_BLOCK_ENV_ACCESS_IN_NODE=false) exposerait la clé maîtresse de n8n à tout nœud Code.
-- La clé reste chiffrée par Vault : seule cle_boite_n8n() la rend, et seulement aux rôles n8n_lecture et service_role.
-- poser_cle_boite_n8n() la range une seule fois. Elle refuse si la clé existe déjà ou n'est pas faite de 32 octets en base64.
-- Elle est appelée par un script de la session principale, qui lit la clé sur Oracle sans jamais l'afficher.
create or replace function public.poser_cle_boite_n8n(p_cle text) returns void
language plpgsql security definer set search_path = '' as $fn$
begin
  if p_cle is null or p_cle !~ '^[A-Za-z0-9+/]{43}=$' then
    raise exception 'poser_cle_boite_n8n : la clé doit faire 32 octets en base64 (44 signes)';
  end if;
  if exists (select 1 from vault.secrets where name = 'boite_cle_n8n') then
    raise exception 'poser_cle_boite_n8n : la clé existe déjà ; on ne la remplace jamais ici';
  end if;
  perform vault.create_secret(p_cle, 'boite_cle_n8n', 'Clé propre à n8n : déchiffre connexions.secret_n8n (0196)');
end
$fn$;
revoke all on function public.poser_cle_boite_n8n(text) from public, anon, authenticated;
grant execute on function public.poser_cle_boite_n8n(text) to service_role;

create or replace function public.cle_boite_n8n() returns text
language sql stable security definer set search_path = '' as $fn$
  select decrypted_secret from vault.decrypted_secrets where name = 'boite_cle_n8n' limit 1
$fn$;
revoke all on function public.cle_boite_n8n() from public, anon, authenticated;
grant execute on function public.cle_boite_n8n() to service_role;
do $droits$
begin
  if exists (select 1 from pg_roles where rolname = 'n8n_lecture') then
    grant execute on function public.cle_boite_n8n() to n8n_lecture;
  else
    raise notice '0196 : rôle n8n_lecture absent (0189 non appliquée) — droit sauté';
  end if;
end
$droits$;
