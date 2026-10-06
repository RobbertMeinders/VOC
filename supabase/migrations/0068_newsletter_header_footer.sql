-- Vaste maar bewerkbare VOC-koptekst (logo) en voettekst (social-links) voor
-- de nieuwsbrief — standaard aan, per nieuwsbrief uit te zetten. Bewust
-- booleans i.p.v. vrij invoerbare header/footer-HTML: de opmaak zelf blijft
-- één consistente sjabloon (render.ts), alleen het tonen/verbergen is per
-- verzending een keuze.
alter table public.communications
  add column show_header boolean not null default true,
  add column show_footer boolean not null default true;
