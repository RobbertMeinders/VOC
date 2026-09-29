-- Bestuur kon een prospect nog niet handmatig verwijderen (enkel select +
-- update-policy in 0051) — nu ook een delete-policy, voor false positives
-- of afgehandelde/onterecht behouden rijen, los van de automatische
-- 90-dagen-opruiming (delete_expired_prospects).
create policy prospects_board_delete on public.prospects
  for delete to authenticated
  using (public.is_board());
