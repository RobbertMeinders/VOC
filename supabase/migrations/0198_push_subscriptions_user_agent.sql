-- Punt 8: push-subscriptions kregen nooit automatisch opgeruimd welk apparaat
-- erbij hoorde -- kreeg een apparaat na verloop van tijd een nieuw endpoint
-- (browser-update, opnieuw toestemming gevraagd, ...), dan bleef het oude
-- abonnement gewoon staan en kreeg een lid dubbele pushmeldingen vanaf
-- hetzelfde toestel. user_agent is een grove, niet-waterdichte
-- apparaatherkenning (twee identieke toestel-/browserversies van hetzelfde
-- lid kunnen botsen), maar beter dan niets -- subscribeToPushAction
-- (profiel/actions.ts) gebruikt 'm om het oude abonnement van hetzelfde
-- apparaat te vervangen i.p.v. te laten stapelen.
alter table public.push_subscriptions add column if not exists user_agent text;

insert into public.schema_migration_log (version) values ('0198') on conflict (version) do nothing;
notify pgrst, 'reload schema';
