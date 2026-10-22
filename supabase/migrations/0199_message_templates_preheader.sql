-- Live feedback: de inbox-voorbeeldtekst viel terug op automatisch
-- afgeleide tekst uit de mail (htmlToPreheaderText(body)), en bij sommige
-- mailclients/doorstuurdiensten kwam daar i.p.v. daarvan een door
-- linktracking herschreven kale URL te staan. 0 (dit bestand) voegt een
-- eigen, door het bestuur in te stellen preheader per berichttype toe
-- (Beheer -> Instellingen -> Berichten) -- renderMessageEmail gebruikt die
-- voortaan als die is ingevuld, en valt alleen terug op de automatische
-- afleiding als het veld leeg is. Elk bestaand sjabloon krijgt hier meteen
-- een passende starttekst, zodat niemand met een leeg veld begint.
alter table public.message_templates add column preheader text;

update public.message_templates set preheader = 'Je aanvraag is goedgekeurd — maak je account aan en ontdek het ledenportaal.' where key = 'uit-nieuw';
update public.message_templates set preheader = 'Je hebt nu toegang tot het VOC-ledenportaal — maak je account aan.' where key = 'uit-bestaand';
update public.message_templates set preheader = 'Je bent uitgenodigd voor het VOC-ledenportaal namens je bedrijf.' where key = 'uit-collega';
update public.message_templates set preheader = 'Met één klik ben je ingelogd — de link is een uur geldig.' where key = 'magic';
update public.message_templates set preheader = 'Kies een nieuw wachtwoord via de link in deze mail — een uur geldig.' where key = 'reset';
update public.message_templates set preheader = 'Bevestig je nieuwe e-mailadres om het in gebruik te nemen.' where key = 'email';

-- nieuw-act/herinnering/wachtlijst/reactie/genoemd/nieuw-lid bewust zonder
-- vaste preheader: subject/body zijn daar zelf al per verzending anders
-- ({{title}}/{{body}}), dus de automatische afleiding uit de echte inhoud
-- is daar juist informatiever dan één vaste tekst voor elk type.

-- Kolomlijst van de RETURNS TABLE wijzigt, dus drop + create i.p.v.
-- "create or replace" (zelfde reden/patroon als eerdere RETURNS TABLE-
-- wijzigingen, bv. 0174/0195).
drop function if exists public.get_message_template(text);

create function public.get_message_template(p_key text)
returns table (subject text, body_html text, cta_label text, after_html text, signature_type text, push_title text, push_body text, preheader text)
language sql
security definer
set search_path = public
stable
as $$
  select subject, body_html, cta_label, after_html, signature_type, push_title, push_body, preheader
  from public.message_templates where key = p_key;
$$;

grant execute on function public.get_message_template(text) to anon, authenticated;

insert into public.schema_migration_log (version) values ('0199') on conflict (version) do nothing;
notify pgrst, 'reload schema';
