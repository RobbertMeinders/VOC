-- Eerste-login onboarding-dialoog (onboarding-opdracht B). Eigen, losse
-- "weggeklikt"-vlag — zelfde opzet als onboarding_dismissed_at
-- (profielfoto-prompt) en introduction_prompt_dismissed_at: dit dialoogje
-- gaat over iets heel anders (kennismaking bij eerste bezoek, niet een
-- ontbrekend profielveld) en moet onafhankelijk daarvan weggeklikt kunnen
-- worden.
alter table public.profiles add column if not exists welcome_dialog_dismissed_at timestamptz;
