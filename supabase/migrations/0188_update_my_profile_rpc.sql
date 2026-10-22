-- Profiel opslaan (updateProfileAction) faalde live met "Opslaan is niet
-- gelukt": de rechtstreekse `supabase.from("profiles").update(...)` leest
-- blijkbaar ook kolommen terug waar authenticated geen SELECT-recht op
-- heeft (phone/email, zie 0062/0091), wat de hele update laat falen op een
-- kolomrechten-subtiliteit in plaats van de bedoelde WHERE-beperking.
-- Zelfde oplossing als get_member_profile/set_company_membership_status:
-- een smalle, eigen SECURITY DEFINER-functie die als functie-eigenaar
-- draait en dus niet door kolom-SELECT-grants geraakt wordt, met
-- `where id = auth.uid()` als enige autorisatie.
--
-- avatar_url/avatar_thumb_url/cover_url kunnen door de aanroepende actie
-- bewust ONGEMOEID gelaten worden (geen nieuwe upload/verwijdering) i.p.v.
-- expliciet op een waarde of NULL gezet — NULL kan niet als die sentinel
-- dienen omdat de overige tekstvelden (bio/job_title/phone/linkedin_url)
-- zelf ook legitiem leeggemaakt moeten kunnen worden. Vandaar een losse
-- p_set_avatar/p_set_cover-vlag naast de waardeparameters.
create function public.update_my_profile(
  p_first_name text,
  p_last_name text,
  p_job_title text,
  p_bio text,
  p_phone text,
  p_linkedin_url text,
  p_set_avatar boolean default false,
  p_avatar_url text default null,
  p_avatar_thumb_url text default null,
  p_set_cover boolean default false,
  p_cover_url text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set
    first_name = p_first_name,
    last_name = p_last_name,
    job_title = p_job_title,
    bio = p_bio,
    phone = p_phone,
    linkedin_url = p_linkedin_url,
    avatar_url = case when p_set_avatar then p_avatar_url else avatar_url end,
    avatar_thumb_url = case when p_set_avatar then p_avatar_thumb_url else avatar_thumb_url end,
    cover_url = case when p_set_cover then p_cover_url else cover_url end
  where id = auth.uid();
end;
$$;

grant execute on function public.update_my_profile(text, text, text, text, text, text, boolean, text, text, boolean, text) to authenticated;
