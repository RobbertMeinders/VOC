-- Communicatieplan: 0079 zette de DEFAULT van email_activities/email_feed al
-- op false (zodat een nieuw lid automatisch op "push" start i.p.v. "beide"),
-- maar dat raakt alleen nieuwe profielen — bestaande rijen (incl. het
-- testaccount, nog bijna de enige echte gebruiker op dit moment) hielden
-- hun oude waarde (true) gewoon aan. Zet bestaande leden expliciet terug naar
-- "push" voor deze twee categorieën, zodat iedereen nu op dezelfde,
-- bewust-gekozen standaard start i.p.v. dat de een "push" en de ander nog
-- "beide" heeft staan puur omdat zijn profiel toevallig vóór deze wijziging
-- is aangemaakt.
update public.profiles
set email_activities = false,
    email_feed = false
where email_activities = true
   or email_feed = true;
