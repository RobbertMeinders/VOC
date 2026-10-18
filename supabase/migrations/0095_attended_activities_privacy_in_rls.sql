-- G1: show_attended_activities (0035_attended_activities_visibility.sql)
-- werd alleen in app-code afgedwongen (MemberProfileContent.tsx, leden/[id]/
-- list-actions.ts) — de onderliggende RLS-policy liet iedere actieve
-- medewerker gewoon élke rij van activity_registrations lezen, inclusief
-- wie iets allang geleden heeft bijgewoond, los van die voorkeur. Een
-- rechtstreekse query (buiten de eigen UI om) omzeilde de instelling dus
-- volledig.
--
-- Tegelijk mag "wie gaat er ook" voor een AANKOMENDE activiteit (de
-- deelnemerslijst op de activiteitpagina zelf, altijd zichtbaar voor elk
-- lid, net als een normale aanmeldlijst) niet door deze instelling
-- geraakt worden — die gaat over het tonen van iemands verzamelde
-- bijgewoonde-evenementen-geschiedenis, niet over wie zich voor één
-- concrete, nog te houden activiteit heeft aangemeld. Vandaar het
-- onderscheid: altijd zichtbaar voor jezelf/bestuur, voor anderen altijd
-- zichtbaar zolang de activiteit nog niet is begonnen, en ná afloop alleen
-- nog als show_attended_activities aan staat.
drop policy if exists "activity_registrations_members_select" on public.activity_registrations;
create policy "activity_registrations_members_select" on public.activity_registrations
  for select using (
    public.is_active_member()
    and (
      profile_id = auth.uid()
      or public.is_board()
      or exists (
        select 1 from public.activities a
        where a.id = activity_registrations.activity_id and a.starts_at >= now()
      )
      or exists (
        select 1 from public.profiles pr
        where pr.id = activity_registrations.profile_id and pr.show_attended_activities = true
      )
    )
  );
