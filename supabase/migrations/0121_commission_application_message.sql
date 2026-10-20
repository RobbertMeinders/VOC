-- UX-feedback: één gedeelde aanmeld-CTA voor commissies i.p.v. een losse
-- aanmeldknop per commissie-kaart (zie vereniging/commissies/page.tsx) —
-- met een optioneel tekstvlak zodat een aanvrager meteen kan toelichten
-- waarom, iets voor het bestuur om bij de beoordeling te gebruiken.
alter table public.commission_applications add column message text;
