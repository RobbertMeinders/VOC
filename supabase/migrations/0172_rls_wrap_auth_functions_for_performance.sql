-- Diepte-audit Blok E2: RLS-policies wrappen auth.uid()/custom-functies in
-- (select ...) zodat Postgres ze eenmalig per query evalueert i.p.v. per rij
-- (Supabase performance-advisor top-aanbeveling). Zuiver mechanisch: de
-- voorwaarde-LOGICA van elke policy blijft woordelijk ongewijzigd, alleen de
-- functie-aanroep zelf krijgt de wrap. Gegenereerd door de laatste, actieve
-- versie van elke policy te herleiden uit de volledige migratiegeschiedenis
-- (een latere migratie kan een eerdere policy al hebben vervangen).

-- public.access_requests
drop policy if exists "access_requests_board_select" on public.access_requests;
drop policy if exists "access_requests_board_update" on public.access_requests;

create policy "access_requests_board_select" on public.access_requests
  for select using ((select public.is_board()));

create policy "access_requests_board_update" on public.access_requests
  for update using ((select public.is_board()));

-- public.activities
drop policy if exists "activities_board_delete" on public.activities;
drop policy if exists "activities_board_insert" on public.activities;
drop policy if exists "activities_board_update" on public.activities;
drop policy if exists "activities_insert" on public.activities;
drop policy if exists "activities_members_select" on public.activities;
drop policy if exists "activities_self_delete_pending" on public.activities;

create policy "activities_board_delete" on public.activities
  for delete using ((select public.is_board()));

create policy "activities_board_insert" on public.activities
  for insert with check ((select public.is_board()));

create policy "activities_board_update" on public.activities
  for update using ((select public.is_board()));

create policy "activities_insert" on public.activities
  for insert with check ((select public.is_active_member()));

create policy "activities_members_select" on public.activities
  for select to authenticated
  using (status in ('approved', 'cancelled') or created_by = (select auth.uid()) or (select public.is_board()));

create policy "activities_self_delete_pending" on public.activities
  for delete using (created_by = (select auth.uid()) and status = 'pending');

-- public.activity_attachments
drop policy if exists "activity_attachments_board_delete" on public.activity_attachments;
drop policy if exists "activity_attachments_board_insert" on public.activity_attachments;
drop policy if exists "activity_attachments_select" on public.activity_attachments;

create policy "activity_attachments_board_delete" on public.activity_attachments
  for delete using ((select public.is_board()));

create policy "activity_attachments_board_insert" on public.activity_attachments
  for insert with check ((select public.is_board()));

create policy "activity_attachments_select" on public.activity_attachments
  for select using ((select public.is_active_member()));

-- public.activity_registrations
drop policy if exists "activity_registrations_board_update" on public.activity_registrations;
drop policy if exists "activity_registrations_members_select" on public.activity_registrations;
drop policy if exists "activity_registrations_self_insert" on public.activity_registrations;
drop policy if exists "activity_registrations_self_or_board_delete" on public.activity_registrations;

create policy "activity_registrations_board_update" on public.activity_registrations
  for update using ((select public.is_board()));

create policy "activity_registrations_members_select" on public.activity_registrations
  for select using (
    (select public.is_active_member())
    and (
      profile_id = (select auth.uid())
      or (select public.is_board())
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

create policy "activity_registrations_self_insert" on public.activity_registrations
  for insert with check (profile_id = (select auth.uid()) and (select public.is_active_member()));

create policy "activity_registrations_self_or_board_delete" on public.activity_registrations
  for delete using (profile_id = (select auth.uid()) or (select public.is_board()));

-- public.activity_slug_aliases
drop policy if exists "activity_slug_aliases_insert" on public.activity_slug_aliases;
drop policy if exists "activity_slug_aliases_select" on public.activity_slug_aliases;

create policy "activity_slug_aliases_insert" on public.activity_slug_aliases
  for insert to authenticated
  with check ((select public.is_board()));

create policy "activity_slug_aliases_select" on public.activity_slug_aliases
  for select to authenticated
  using ((select public.is_active_member()));

-- public.app_settings
drop policy if exists "app_settings_admin_update" on public.app_settings;

create policy "app_settings_admin_update" on public.app_settings
  for update using ((select public.is_admin()));

-- public.audit_logs
drop policy if exists "audit_logs_board_select" on public.audit_logs;

create policy "audit_logs_board_select" on public.audit_logs
  for select using ((select public.is_board()));

-- public.board_positions
drop policy if exists "board_positions_board_delete" on public.board_positions;
drop policy if exists "board_positions_board_insert" on public.board_positions;
drop policy if exists "board_positions_board_update" on public.board_positions;
drop policy if exists "board_positions_members_select" on public.board_positions;

create policy "board_positions_board_delete" on public.board_positions
  for delete using ((select public.is_board()));

create policy "board_positions_board_insert" on public.board_positions
  for insert with check ((select public.is_board()));

create policy "board_positions_board_update" on public.board_positions
  for update using ((select public.is_board()));

create policy "board_positions_members_select" on public.board_positions
  for select using ((select public.is_active_member()));

-- public.commission_applications
drop policy if exists "commission_applications_board_update" on public.commission_applications;
drop policy if exists "commission_applications_self_insert" on public.commission_applications;
drop policy if exists "commission_applications_self_or_board_select" on public.commission_applications;

create policy "commission_applications_board_update" on public.commission_applications
  for update using ((select public.is_board()));

create policy "commission_applications_self_insert" on public.commission_applications
  for insert with check (profile_id = (select auth.uid()) and (select public.is_active_member()));

create policy "commission_applications_self_or_board_select" on public.commission_applications
  for select using (profile_id = (select auth.uid()) or (select public.is_board()));

-- public.commission_memberships
drop policy if exists "commission_memberships_board_delete" on public.commission_memberships;
drop policy if exists "commission_memberships_board_insert" on public.commission_memberships;
drop policy if exists "commission_memberships_members_select" on public.commission_memberships;

create policy "commission_memberships_board_delete" on public.commission_memberships
  for delete using ((select public.is_board()));

create policy "commission_memberships_board_insert" on public.commission_memberships
  for insert with check ((select public.is_board()));

create policy "commission_memberships_members_select" on public.commission_memberships
  for select using ((select public.is_active_member()));

-- public.commissions
drop policy if exists "commissions_board_delete" on public.commissions;
drop policy if exists "commissions_board_insert" on public.commissions;
drop policy if exists "commissions_board_update" on public.commissions;
drop policy if exists "commissions_members_select" on public.commissions;

create policy "commissions_board_delete" on public.commissions
  for delete using ((select public.is_board()));

create policy "commissions_board_insert" on public.commissions
  for insert with check ((select public.is_board()));

create policy "commissions_board_update" on public.commissions
  for update using ((select public.is_board()));

create policy "commissions_members_select" on public.commissions
  for select using ((select public.is_active_member()));

-- public.communication_contact_sends
drop policy if exists "board_manage_communication_contact_sends" on public.communication_contact_sends;

create policy "board_manage_communication_contact_sends" on public.communication_contact_sends for all
  using ((select public.is_board())) with check ((select public.is_board()));

-- public.communication_deliveries
drop policy if exists "board_manage_communication_deliveries" on public.communication_deliveries;

create policy "board_manage_communication_deliveries" on public.communication_deliveries for all
  using ((select public.is_board())) with check ((select public.is_board()));

-- public.communication_recipient_contacts
drop policy if exists "board_manage_communication_recipient_contacts" on public.communication_recipient_contacts;

create policy "board_manage_communication_recipient_contacts" on public.communication_recipient_contacts for all
  using ((select public.is_board())) with check ((select public.is_board()));

-- public.communication_recipient_lists
drop policy if exists "board_manage_communication_recipient_lists" on public.communication_recipient_lists;

create policy "board_manage_communication_recipient_lists" on public.communication_recipient_lists for all
  using ((select public.is_board())) with check ((select public.is_board()));

-- public.communication_recipient_profiles
drop policy if exists "board_manage_communication_recipient_profiles" on public.communication_recipient_profiles;

create policy "board_manage_communication_recipient_profiles" on public.communication_recipient_profiles for all
  using ((select public.is_board())) with check ((select public.is_board()));

-- public.communication_send_attempts
drop policy if exists "board_manage_communication_send_attempts" on public.communication_send_attempts;

create policy "board_manage_communication_send_attempts" on public.communication_send_attempts for all
  using ((select public.is_board())) with check ((select public.is_board()));

-- public.communications
drop policy if exists "communications_board_delete" on public.communications;
drop policy if exists "communications_board_insert" on public.communications;
drop policy if exists "communications_board_select" on public.communications;
drop policy if exists "communications_board_update" on public.communications;

create policy "communications_board_delete" on public.communications
  for delete using ((select public.is_board()));

create policy "communications_board_insert" on public.communications
  for insert with check ((select public.is_board()));

create policy "communications_board_select" on public.communications
  for select using ((select public.is_board()));

create policy "communications_board_update" on public.communications
  for update using ((select public.is_board()));

-- public.companies
drop policy if exists "companies_admin_delete" on public.companies;
drop policy if exists "companies_board_update" on public.companies;
drop policy if exists "companies_member_update" on public.companies;
drop policy if exists "companies_members_insert" on public.companies;
drop policy if exists "companies_members_select" on public.companies;

create policy "companies_admin_delete" on public.companies
  for delete using ((select public.is_admin()));

create policy "companies_board_update" on public.companies
  for update using ((select public.is_board()));

create policy "companies_member_update" on public.companies
  for update using (
    (select public.is_active_member())
    and exists (
      select 1 from public.company_members
      where company_id = companies.id and profile_id = (select auth.uid())
    )
  );

create policy "companies_members_insert" on public.companies
  for insert with check ((select public.is_active_member()));

create policy "companies_members_select" on public.companies
  for select using ((select public.is_active_member()));

-- public.company_billing_details
drop policy if exists "company_billing_details_member_insert" on public.company_billing_details;
drop policy if exists "company_billing_details_member_select" on public.company_billing_details;
drop policy if exists "company_billing_details_member_update" on public.company_billing_details;

create policy "company_billing_details_member_insert" on public.company_billing_details
  for insert with check (
    (select public.is_board())
    or (
      (select public.is_active_member())
      and exists (
        select 1 from public.company_members
        where company_id = company_billing_details.company_id and profile_id = (select auth.uid())
      )
    )
  );

create policy "company_billing_details_member_select" on public.company_billing_details
  for select using (
    (select public.is_board())
    or (
      (select public.is_active_member())
      and exists (
        select 1 from public.company_members
        where company_id = company_billing_details.company_id and profile_id = (select auth.uid())
      )
    )
  );

create policy "company_billing_details_member_update" on public.company_billing_details
  for update using (
    (select public.is_board())
    or (
      (select public.is_active_member())
      and exists (
        select 1 from public.company_members
        where company_id = company_billing_details.company_id and profile_id = (select auth.uid())
      )
    )
  );

-- public.company_members
drop policy if exists "company_members_board_insert" on public.company_members;
drop policy if exists "company_members_board_update" on public.company_members;
drop policy if exists "company_members_select" on public.company_members;
drop policy if exists "company_members_self_new_company_insert" on public.company_members;
drop policy if exists "company_members_self_or_board_delete" on public.company_members;

create policy "company_members_board_insert" on public.company_members
  for insert with check ((select public.is_board()));

create policy "company_members_board_update" on public.company_members
  for update using ((select public.is_board()));

create policy "company_members_select" on public.company_members
  for select using ((select public.is_active_member()));

create policy "company_members_self_new_company_insert" on public.company_members
  for insert with check (
    profile_id = (select auth.uid())
    and (select public.is_active_member())
    and exists (select 1 from public.companies c where c.id = company_members.company_id and c.created_by = (select auth.uid()))
    and not exists (select 1 from public.company_members cm where cm.company_id = company_members.company_id)
  );

create policy "company_members_self_or_board_delete" on public.company_members
  for delete using (profile_id = (select auth.uid()) or (select public.is_board()));

-- public.company_membership_requests
drop policy if exists "company_membership_requests_decide_update" on public.company_membership_requests;
drop policy if exists "company_membership_requests_select" on public.company_membership_requests;
drop policy if exists "company_membership_requests_self_insert" on public.company_membership_requests;
drop policy if exists "company_membership_requests_self_or_board_delete" on public.company_membership_requests;

create policy "company_membership_requests_decide_update" on public.company_membership_requests
  for update using (
    (select public.is_board())
    or exists (
      select 1 from public.company_members cm
      where cm.company_id = company_membership_requests.company_id
        and cm.profile_id = (select auth.uid())
        and (select public.is_active_member())
    )
  );

create policy "company_membership_requests_select" on public.company_membership_requests
  for select using (
    profile_id = (select auth.uid())
    or (select public.is_board())
    or exists (
      select 1 from public.company_members cm
      where cm.company_id = company_membership_requests.company_id
        and cm.profile_id = (select auth.uid())
        and (select public.is_active_member())
    )
  );

create policy "company_membership_requests_self_insert" on public.company_membership_requests
  for insert with check (profile_id = (select auth.uid()) and (select public.is_active_member()));

create policy "company_membership_requests_self_or_board_delete" on public.company_membership_requests
  for delete using (
    (profile_id = (select auth.uid()) and status = 'pending') or (select public.is_board())
  );

-- public.contact_list_contacts
drop policy if exists "board_manage_contact_list_contacts" on public.contact_list_contacts;

create policy "board_manage_contact_list_contacts" on public.contact_list_contacts for all
  using ((select public.is_board())) with check ((select public.is_board()));

-- public.contact_list_profiles
drop policy if exists "board_manage_contact_list_profiles" on public.contact_list_profiles;

create policy "board_manage_contact_list_profiles" on public.contact_list_profiles for all
  using ((select public.is_board())) with check ((select public.is_board()));

-- public.contact_lists
drop policy if exists "board_manage_contact_lists" on public.contact_lists;

create policy "board_manage_contact_lists" on public.contact_lists for all
  using ((select public.is_board())) with check ((select public.is_board()));

-- public.contacts
drop policy if exists "board_manage_contacts" on public.contacts;

create policy "board_manage_contacts" on public.contacts for all
  using ((select public.is_board())) with check ((select public.is_board()));

-- public.documents
drop policy if exists "documents_board_delete" on public.documents;
drop policy if exists "documents_board_insert" on public.documents;
drop policy if exists "documents_board_update" on public.documents;
drop policy if exists "documents_members_select" on public.documents;

create policy "documents_board_delete" on public.documents
  for delete using ((select public.is_board()));

create policy "documents_board_insert" on public.documents
  for insert with check ((select public.is_board()));

create policy "documents_board_update" on public.documents
  for update using ((select public.is_board()));

create policy "documents_members_select" on public.documents
  for select using ((select public.is_active_member()));

-- public.email_templates
drop policy if exists "email_templates_admin_select" on public.email_templates;
drop policy if exists "email_templates_admin_update" on public.email_templates;
drop policy if exists "email_templates_board_select" on public.email_templates;
drop policy if exists "email_templates_board_update" on public.email_templates;

create policy "email_templates_admin_select" on public.email_templates
  for select using ((select public.is_admin()));

create policy "email_templates_admin_update" on public.email_templates
  for update using ((select public.is_admin()));

create policy "email_templates_board_select" on public.email_templates
  for select using ((select public.is_board()));

create policy "email_templates_board_update" on public.email_templates
  for update using ((select public.is_board()));

-- public.events
drop policy if exists "events_board_select" on public.events;

create policy "events_board_select" on public.events
  for select using ((select public.is_board()));

-- public.feed_attachments
drop policy if exists "feed_attachments_author_insert" on public.feed_attachments;
drop policy if exists "feed_attachments_author_or_board_delete" on public.feed_attachments;
drop policy if exists "feed_attachments_members_select" on public.feed_attachments;

create policy "feed_attachments_author_insert" on public.feed_attachments
  for insert with check (
    exists (
      select 1 from public.feed_posts
      where id = post_id and author_id = (select auth.uid())
    )
  );

create policy "feed_attachments_author_or_board_delete" on public.feed_attachments
  for delete using (
    (select public.is_board())
    or exists (select 1 from public.feed_posts where id = post_id and author_id = (select auth.uid()))
  );

create policy "feed_attachments_members_select" on public.feed_attachments
  for select using ((select public.is_active_member()));

-- public.feed_comment_likes
drop policy if exists "feed_comment_likes_members_select" on public.feed_comment_likes;
drop policy if exists "feed_comment_likes_self_delete" on public.feed_comment_likes;
drop policy if exists "feed_comment_likes_self_insert" on public.feed_comment_likes;

create policy "feed_comment_likes_members_select" on public.feed_comment_likes
  for select using ((select public.is_active_member()));

create policy "feed_comment_likes_self_delete" on public.feed_comment_likes
  for delete using (
    profile_id = (select auth.uid())
    or (select public.is_board())
    or exists (select 1 from public.feed_comments where id = comment_id and author_id = (select auth.uid()))
  );

create policy "feed_comment_likes_self_insert" on public.feed_comment_likes
  for insert with check (profile_id = (select auth.uid()) and (select public.is_active_member()));

-- public.feed_comments
drop policy if exists "feed_comments_admin_update" on public.feed_comments;
drop policy if exists "feed_comments_members_select" on public.feed_comments;
drop policy if exists "feed_comments_self_insert" on public.feed_comments;
drop policy if exists "feed_comments_self_or_board_delete" on public.feed_comments;
drop policy if exists "feed_comments_self_update" on public.feed_comments;

create policy "feed_comments_admin_update" on public.feed_comments
  for update using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "feed_comments_members_select" on public.feed_comments
  for select using ((select public.is_active_member()));

create policy "feed_comments_self_insert" on public.feed_comments
  for insert with check (author_id = (select auth.uid()) and (select public.is_active_member()));

create policy "feed_comments_self_or_board_delete" on public.feed_comments
  for delete using (author_id = (select auth.uid()) or (select public.is_board()));

create policy "feed_comments_self_update" on public.feed_comments
  for update using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

-- public.feed_likes
drop policy if exists "feed_likes_members_select" on public.feed_likes;
drop policy if exists "feed_likes_self_delete" on public.feed_likes;
drop policy if exists "feed_likes_self_insert" on public.feed_likes;

create policy "feed_likes_members_select" on public.feed_likes
  for select using ((select public.is_active_member()));

create policy "feed_likes_self_delete" on public.feed_likes
  for delete using (
    profile_id = (select auth.uid())
    or (select public.is_board())
    or exists (select 1 from public.feed_posts where id = post_id and author_id = (select auth.uid()))
  );

create policy "feed_likes_self_insert" on public.feed_likes
  for insert with check (profile_id = (select auth.uid()) and (select public.is_active_member()));

-- public.feed_post_reports
drop policy if exists "feed_post_reports_author_or_board_delete" on public.feed_post_reports;
drop policy if exists "feed_post_reports_board_delete" on public.feed_post_reports;
drop policy if exists "feed_post_reports_board_select" on public.feed_post_reports;
drop policy if exists "feed_post_reports_board_update" on public.feed_post_reports;
drop policy if exists "feed_post_reports_self_insert" on public.feed_post_reports;

create policy "feed_post_reports_author_or_board_delete" on public.feed_post_reports
  for delete using (
    (select public.is_board())
    or exists (select 1 from public.feed_posts where id = post_id and author_id = (select auth.uid()))
  );

create policy "feed_post_reports_board_delete" on public.feed_post_reports
  for delete using ((select public.is_board()));

create policy "feed_post_reports_board_select" on public.feed_post_reports
  for select using ((select public.is_board()));

create policy "feed_post_reports_board_update" on public.feed_post_reports
  for update using ((select public.is_board())) with check ((select public.is_board()));

create policy "feed_post_reports_self_insert" on public.feed_post_reports
  for insert with check (reporter_id = (select auth.uid()) and (select public.is_active_member()));

-- public.feed_posts
drop policy if exists "feed_posts_admin_update" on public.feed_posts;
drop policy if exists "feed_posts_members_select" on public.feed_posts;
drop policy if exists "feed_posts_self_insert" on public.feed_posts;
drop policy if exists "feed_posts_self_or_board_delete" on public.feed_posts;
drop policy if exists "feed_posts_self_update" on public.feed_posts;

create policy "feed_posts_admin_update" on public.feed_posts
  for update using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "feed_posts_members_select" on public.feed_posts
  for select using ((select public.is_active_member()));

create policy "feed_posts_self_insert" on public.feed_posts
  for insert with check (author_id = (select auth.uid()) and (select public.is_active_member()));

create policy "feed_posts_self_or_board_delete" on public.feed_posts
  for delete using (author_id = (select auth.uid()) or (select public.is_board()));

create policy "feed_posts_self_update" on public.feed_posts
  for update using (author_id = (select auth.uid()))
  with check (author_id = (select auth.uid()));

-- public.invitations
drop policy if exists "invitations_board_select" on public.invitations;
drop policy if exists "invitations_insert" on public.invitations;
drop policy if exists "invitations_update" on public.invitations;

create policy "invitations_board_select" on public.invitations
  for select using (
    (select public.is_admin()) or (role = 'lid' and (select public.is_board()))
  );

create policy "invitations_insert" on public.invitations
  for insert with check (
    invited_by = (select auth.uid())
    and ((select public.is_admin()) or (role = 'lid' and (select public.is_board())))
  );

create policy "invitations_update" on public.invitations
  for update using (
    (select public.is_admin()) or (role = 'lid' and (select public.is_board()))
  );

-- public.message_templates
drop policy if exists "message_templates_admin_select" on public.message_templates;
drop policy if exists "message_templates_admin_update" on public.message_templates;

create policy "message_templates_admin_select" on public.message_templates
  for select using ((select public.is_admin()));

create policy "message_templates_admin_update" on public.message_templates
  for update using ((select public.is_admin()));

-- public.news_items
drop policy if exists "news_items_board_delete" on public.news_items;
drop policy if exists "news_items_board_insert" on public.news_items;
drop policy if exists "news_items_board_update" on public.news_items;
drop policy if exists "news_items_members_select" on public.news_items;

create policy "news_items_board_delete" on public.news_items
  for delete using ((select public.is_board()));

create policy "news_items_board_insert" on public.news_items
  for insert with check ((select public.is_board()));

create policy "news_items_board_update" on public.news_items
  for update using ((select public.is_board()));

create policy "news_items_members_select" on public.news_items
  for select using ((select public.is_active_member()));

-- public.notification_type_settings
drop policy if exists "notification_type_settings_board_select" on public.notification_type_settings;
drop policy if exists "notification_type_settings_board_update" on public.notification_type_settings;

create policy "notification_type_settings_board_select" on public.notification_type_settings
  for select using ((select public.is_board()));

create policy "notification_type_settings_board_update" on public.notification_type_settings
  for update using ((select public.is_board()));

-- public.notifications
drop policy if exists "notifications_board_select" on public.notifications;
drop policy if exists "notifications_self_delete" on public.notifications;
drop policy if exists "notifications_self_select" on public.notifications;
drop policy if exists "notifications_self_update" on public.notifications;

create policy "notifications_board_select" on public.notifications
  for select using ((select public.is_board()));

create policy "notifications_self_delete" on public.notifications
  for delete using (profile_id = (select auth.uid()));

create policy "notifications_self_select" on public.notifications
  for select using (profile_id = (select auth.uid()));

create policy "notifications_self_update" on public.notifications
  for update using (profile_id = (select auth.uid()));

-- public.org_profile
drop policy if exists "org_profile_board_update" on public.org_profile;
drop policy if exists "org_profile_members_select" on public.org_profile;

create policy "org_profile_board_update" on public.org_profile
  for update using ((select public.is_board()));

create policy "org_profile_members_select" on public.org_profile
  for select using ((select public.is_active_member()));

-- public.profiles
drop policy if exists "profiles_admin_update" on public.profiles;
drop policy if exists "profiles_board_update" on public.profiles;
drop policy if exists "profiles_members_select" on public.profiles;
drop policy if exists "profiles_self_select" on public.profiles;
drop policy if exists "profiles_self_update" on public.profiles;

create policy "profiles_admin_update" on public.profiles
  for update using ((select public.is_admin()));

create policy "profiles_board_update" on public.profiles
  for update using ((select public.is_board()));

create policy "profiles_members_select" on public.profiles
  for select using ((select public.is_active_member()));

create policy "profiles_self_select" on public.profiles
  for select using (id = (select auth.uid()));

create policy "profiles_self_update" on public.profiles
  for update using (id = (select auth.uid()) and (select public.is_active_member()))
  with check (id = (select auth.uid()) and (select public.is_active_member()));

-- public.public_activity_registrations
drop policy if exists "public_activity_registrations_board_select" on public.public_activity_registrations;

create policy "public_activity_registrations_board_select" on public.public_activity_registrations
  for select using ((select public.is_board()));

-- public.push_subscriptions
drop policy if exists "push_subscriptions_self_delete" on public.push_subscriptions;
drop policy if exists "push_subscriptions_self_insert" on public.push_subscriptions;
drop policy if exists "push_subscriptions_self_select" on public.push_subscriptions;
drop policy if exists "push_subscriptions_self_update" on public.push_subscriptions;

create policy "push_subscriptions_self_delete" on public.push_subscriptions
  for delete using (profile_id = (select auth.uid()));

create policy "push_subscriptions_self_insert" on public.push_subscriptions
  for insert with check (profile_id = (select auth.uid()));

create policy "push_subscriptions_self_select" on public.push_subscriptions
  for select using (profile_id = (select auth.uid()));

create policy "push_subscriptions_self_update" on public.push_subscriptions
  for update using (profile_id = (select auth.uid()));

-- public.push_templates
drop policy if exists "push_templates_admin_select" on public.push_templates;
drop policy if exists "push_templates_admin_update" on public.push_templates;
drop policy if exists "push_templates_board_select" on public.push_templates;
drop policy if exists "push_templates_board_update" on public.push_templates;

create policy "push_templates_admin_select" on public.push_templates
  for select using ((select public.is_admin()));

create policy "push_templates_admin_update" on public.push_templates
  for update using ((select public.is_admin()));

create policy "push_templates_board_select" on public.push_templates
  for select using ((select public.is_board()));

create policy "push_templates_board_update" on public.push_templates
  for update using ((select public.is_board()));

-- public.testfase_feedback
drop policy if exists "testfase_feedback_admin_select" on public.testfase_feedback;
drop policy if exists "testfase_feedback_insert" on public.testfase_feedback;

create policy "testfase_feedback_admin_select" on public.testfase_feedback
  for select using ((select public.is_admin()));

create policy "testfase_feedback_insert" on public.testfase_feedback
  for insert with check (profile_id = (select auth.uid()) and (select public.is_active_member()));

-- storage.objects
drop policy if exists "activity_attachments_storage_board_delete" on storage.objects;
drop policy if exists "activity_attachments_storage_board_insert" on storage.objects;
drop policy if exists "activity_attachments_storage_select" on storage.objects;
drop policy if exists "activity_images_board_delete" on storage.objects;
drop policy if exists "activity_images_board_insert" on storage.objects;
drop policy if exists "activity_images_board_update" on storage.objects;
drop policy if exists "avatars_owner_delete" on storage.objects;
drop policy if exists "avatars_owner_or_admin_insert" on storage.objects;
drop policy if exists "avatars_owner_or_admin_update" on storage.objects;
drop policy if exists "avatars_select" on storage.objects;
drop policy if exists "company_logos_board_delete" on storage.objects;
drop policy if exists "company_logos_board_insert" on storage.objects;
drop policy if exists "company_logos_board_update" on storage.objects;
drop policy if exists "company_logos_member_delete" on storage.objects;
drop policy if exists "company_logos_member_insert" on storage.objects;
drop policy if exists "company_logos_member_update" on storage.objects;
drop policy if exists "company_logos_select" on storage.objects;
drop policy if exists "documents_board_delete" on storage.objects;
drop policy if exists "documents_board_insert" on storage.objects;
drop policy if exists "documents_board_update" on storage.objects;
drop policy if exists "documents_select" on storage.objects;
drop policy if exists "email_assets_board_delete" on storage.objects;
drop policy if exists "email_assets_board_insert" on storage.objects;
drop policy if exists "email_assets_board_update" on storage.objects;
drop policy if exists "feed_media_owner_insert" on storage.objects;
drop policy if exists "feed_media_owner_or_board_delete" on storage.objects;
drop policy if exists "feed_media_select" on storage.objects;
drop policy if exists "feedback_screenshots_admin_select" on storage.objects;
drop policy if exists "feedback_screenshots_insert" on storage.objects;
drop policy if exists "news_images_board_delete" on storage.objects;
drop policy if exists "news_images_board_insert" on storage.objects;
drop policy if exists "news_images_board_update" on storage.objects;
drop policy if exists "news_images_select" on storage.objects;

create policy "activity_attachments_storage_board_delete" on storage.objects
  for delete using (bucket_id = 'activity-attachments' and (select public.is_board()));

create policy "activity_attachments_storage_board_insert" on storage.objects
  for insert with check (bucket_id = 'activity-attachments' and (select public.is_board()));

create policy "activity_attachments_storage_select" on storage.objects
  for select using (bucket_id = 'activity-attachments' and (select public.is_active_member()));

create policy "activity_images_board_delete" on storage.objects
  for delete using (bucket_id = 'activity-images' and (select public.is_board()));

create policy "activity_images_board_insert" on storage.objects
  for insert with check (bucket_id = 'activity-images' and (select public.is_board()));

create policy "activity_images_board_update" on storage.objects
  for update using (bucket_id = 'activity-images' and (select public.is_board()));

create policy "avatars_owner_delete" on storage.objects
  for delete using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "avatars_owner_or_admin_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars' and (select public.is_active_member())
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

create policy "avatars_owner_or_admin_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin()))
  );

create policy "avatars_select" on storage.objects
  for select using (bucket_id = 'avatars' and (select public.is_active_member()));

create policy "company_logos_board_delete" on storage.objects
  for delete using (bucket_id = 'company-logos' and (select public.is_board()));

create policy "company_logos_board_insert" on storage.objects
  for insert with check (bucket_id = 'company-logos' and (select public.is_board()));

create policy "company_logos_board_update" on storage.objects
  for update using (bucket_id = 'company-logos' and (select public.is_board()));

create policy "company_logos_member_delete" on storage.objects
  for delete using (
    bucket_id = 'company-logos'
    and (select public.is_active_member())
    and exists (
      select 1 from public.company_members
      where profile_id = (select auth.uid()) and company_id::text = (storage.foldername(name))[1]
    )
  );

create policy "company_logos_member_insert" on storage.objects
  for insert with check (
    bucket_id = 'company-logos'
    and (select public.is_active_member())
    and exists (
      select 1 from public.company_members
      where profile_id = (select auth.uid()) and company_id::text = (storage.foldername(name))[1]
    )
  );

create policy "company_logos_member_update" on storage.objects
  for update using (
    bucket_id = 'company-logos'
    and (select public.is_active_member())
    and exists (
      select 1 from public.company_members
      where profile_id = (select auth.uid()) and company_id::text = (storage.foldername(name))[1]
    )
  );

create policy "company_logos_select" on storage.objects
  for select using (bucket_id = 'company-logos' and (select public.is_active_member()));

create policy "documents_board_delete" on storage.objects
  for delete using (bucket_id = 'documents' and (select public.is_board()));

create policy "documents_board_insert" on storage.objects
  for insert with check (bucket_id = 'documents' and (select public.is_board()));

create policy "documents_board_update" on storage.objects
  for update using (bucket_id = 'documents' and (select public.is_board()));

create policy "documents_select" on storage.objects
  for select using (bucket_id = 'documents' and (select public.is_active_member()));

create policy "email_assets_board_delete" on storage.objects
  for delete using (bucket_id = 'email-assets' and (select public.is_board()));

create policy "email_assets_board_insert" on storage.objects
  for insert with check (bucket_id = 'email-assets' and (select public.is_board()));

create policy "email_assets_board_update" on storage.objects
  for update using (bucket_id = 'email-assets' and (select public.is_board()));

create policy "feed_media_owner_insert" on storage.objects
  for insert with check (
    bucket_id = 'feed-media' and (select public.is_active_member())
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "feed_media_owner_or_board_delete" on storage.objects
  for delete using (
    bucket_id = 'feed-media'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_board()))
  );

create policy "feed_media_select" on storage.objects
  for select using (bucket_id = 'feed-media' and (select public.is_active_member()));

create policy "feedback_screenshots_admin_select" on storage.objects
  for select using (bucket_id = 'feedback-screenshots' and (select public.is_admin()));

create policy "feedback_screenshots_insert" on storage.objects
  for insert with check (bucket_id = 'feedback-screenshots' and (select public.is_active_member()));

create policy "news_images_board_delete" on storage.objects
  for delete using (bucket_id = 'news-images' and (select public.is_board()));

create policy "news_images_board_insert" on storage.objects
  for insert with check (bucket_id = 'news-images' and (select public.is_board()));

create policy "news_images_board_update" on storage.objects
  for update using (bucket_id = 'news-images' and (select public.is_board()));

create policy "news_images_select" on storage.objects
  for select using (bucket_id = 'news-images' and (select public.is_active_member()));
