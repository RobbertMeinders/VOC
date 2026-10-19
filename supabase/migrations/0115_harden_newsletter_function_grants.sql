-- Vervolg op 0114_internal_function_grants.sql (zelfde reden: Postgres geeft
-- EXECUTE op een nieuwe functie in schema public standaard aan PUBLIC, dus
-- "grant ... to service_role" alleen volstond niet) — toegepast op de twee
-- functies die deze branch zelf heeft toegevoegd/vervangen (0112, 0113),
-- ná 0114 geschreven en dus nog niet daarin meegenomen. Idempotent.

begin;

-- Trigger-only: wordt nooit rechtstreeks aangeroepen (en zou dat ook niet
-- kunnen — Postgres staat een directe aanroep van een triggerfunctie buiten
-- triggerverband sowieso niet toe), maar krijgt voor de duidelijkheid
-- dezelfde expliciete rechten als de overige interne functies.
revoke execute on function public.handle_user_email_change() from public, anon, authenticated;
grant execute on function public.handle_user_email_change() to service_role;

-- Wel nodig voor authenticated: wordt zowel aangeroepen vanuit de sessie
-- van een bestuurslid (sendNewsletterAction, de "Versturen"-knop) als
-- vanuit de cron met de service-role-client (performNewsletterSend) — de
-- functie zelf controleert al is_board()/service_role, dit sluit alleen de
-- standaard PUBLIC-toegang.
revoke execute on function public.claim_newsletter_send(uuid) from public, anon;
grant execute on function public.claim_newsletter_send(uuid) to authenticated, service_role;

commit;
