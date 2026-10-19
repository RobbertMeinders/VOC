-- Interne functies alleen voor de server (service_role): rechten voor anon en
-- authenticated ingetrokken. De app roept deze functies uitsluitend via de server aan.
-- Idempotent.

begin;

revoke execute on function public.anonymize_profile_now(uuid)                         from public, anon, authenticated;
revoke execute on function public.anonymize_expired_profiles()                         from public, anon, authenticated;
revoke execute on function public.delete_expired_prospects()                           from public, anon, authenticated;
revoke execute on function public.create_activity_reminders()                          from public, anon, authenticated;
revoke execute on function public.force_logout_member(uuid)                            from public, anon, authenticated;
revoke execute on function public.force_logout_all_members(uuid)                       from public, anon, authenticated;
revoke execute on function public.get_pending_email_notifications(integer)             from public, anon, authenticated;
revoke execute on function public.get_pending_push_notifications(integer)              from public, anon, authenticated;
revoke execute on function public.mark_notifications_emailed(uuid[])                   from public, anon, authenticated;
revoke execute on function public.mark_notifications_pushed(uuid[])                    from public, anon, authenticated;
revoke execute on function public.set_notification_email_provider_id(uuid, text)       from public, anon, authenticated;
revoke execute on function public.get_push_template(text)                              from public, anon, authenticated;
revoke execute on function public.dispatch_mention_notifications(text, uuid, text)     from public, anon, authenticated;
revoke execute on function public.dispatch_mention_notifications(text, uuid, text, uuid) from public, anon, authenticated;
revoke execute on function public.promote_next_waitlisted()                            from public, anon, authenticated;

grant execute on function public.anonymize_profile_now(uuid)                         to service_role;
grant execute on function public.anonymize_expired_profiles()                         to service_role;
grant execute on function public.delete_expired_prospects()                           to service_role;
grant execute on function public.create_activity_reminders()                          to service_role;
grant execute on function public.force_logout_member(uuid)                            to service_role;
grant execute on function public.force_logout_all_members(uuid)                       to service_role;
grant execute on function public.get_pending_email_notifications(integer)             to service_role;
grant execute on function public.get_pending_push_notifications(integer)              to service_role;
grant execute on function public.mark_notifications_emailed(uuid[])                   to service_role;
grant execute on function public.mark_notifications_pushed(uuid[])                    to service_role;
grant execute on function public.set_notification_email_provider_id(uuid, text)       to service_role;
grant execute on function public.get_push_template(text)                              to service_role;
grant execute on function public.dispatch_mention_notifications(text, uuid, text)     to service_role;
grant execute on function public.dispatch_mention_notifications(text, uuid, text, uuid) to service_role;
grant execute on function public.promote_next_waitlisted()                            to service_role;

commit;
