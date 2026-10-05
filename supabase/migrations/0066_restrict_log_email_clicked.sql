-- log_email_clicked (0065_communications.sql) kreeg per ongeluk dezelfde
-- brede grant als log_email_opened vóór de 0060-beveiligingsaudit: open voor
-- anon/authenticated, met als enige "bescherming" dat een aanroeper het
-- juiste provider_id (Resend's eigen send-id) zou moeten raden. Net als
-- log_email_opened hoort dit alleen door de al zelf handtekening-
-- gecontroleerde Resend-webhook aangeroepen te worden (via de service-role-
-- client) — nooit rechtstreeks door een ingelogde of anonieme gebruiker.
revoke execute on function public.log_email_clicked(text, text) from anon, authenticated;
grant execute on function public.log_email_clicked(text, text) to service_role;
